import {
  BadGatewayException,
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import type { Session, SessionData } from 'express-session';
import type {
  GithubRepositoryDetails,
  GithubRepositoryResponse,
  GithubTreeEntry,
  ListRepositoriesResponse,
  RepositoryCheckResult,
  RepositoryRecommendation,
  RepositoryScanResponse,
  ScanSeverity,
  ScanType,
} from './repositories.types';
import {
  buildDidacticChecks,
  inferRepositoryContext,
} from './scanner-evaluation';

type AppSession = Session & Partial<SessionData>;

interface RepositoryScanContext {
  accessToken: string;
  repository: GithubRepositoryDetails;
  owner: string;
  repoName: string;
  fullName: string;
}

interface RepositoryTreeData {
  entries: GithubTreeEntry[];
  pathSet: Set<string>;
  lowerPathSet: Set<string>;
}

interface GithubTreeResponse {
  tree?: GithubTreeEntry[];
  truncated?: boolean;
}

interface GithubContentFileResponse {
  type?: string;
  encoding?: string;
  content?: string;
}

const ISSUE_THRESHOLD = 25;
const PULL_REQUEST_THRESHOLD = 10;
const RECENT_ACTIVITY_DAYS = 90;
const INACTIVE_ACTIVITY_DAYS = 180;
const MAX_PATTERN_SCAN_FILES = 30;

const TEXT_FILE_EXTENSIONS = [
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.env',
  '.md',
  '.txt',
  '.py',
  '.go',
  '.java',
  '.rb',
  '.php',
  '.sh',
];

@Injectable()
export class RepositoriesService {
  async listAuthenticatedPublicRepositories(
    session: AppSession,
  ): Promise<ListRepositoriesResponse> {
    const accessToken = this.requireGithubAccessToken(session);
    const endpoint = new URL('https://api.github.com/user/repos');
    endpoint.searchParams.set('visibility', 'public');
    endpoint.searchParams.set('sort', 'updated');
    endpoint.searchParams.set('direction', 'desc');
    endpoint.searchParams.set('per_page', '100');

    const githubResponse = await this.githubFetch(endpoint, accessToken);

    if (!githubResponse.ok) {
      this.throwGithubError(githubResponse.status);
    }

    const repositoriesPayload =
      (await githubResponse.json()) as GithubRepositoryResponse[];

    if (!Array.isArray(repositoriesPayload)) {
      throw new BadGatewayException('Unexpected repositories response.');
    }

    const repositories = repositoriesPayload
      .filter((repository) => repository.private === false)
      .map((repository) => ({
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
        description: repository.description,
        language: repository.language,
        private: repository.private,
        fork: repository.fork,
        archived: repository.archived,
        defaultBranch: repository.default_branch,
        stars: repository.stargazers_count,
        forks: repository.forks_count,
        openIssues: repository.open_issues_count,
        pushedAt: repository.pushed_at,
        updatedAt: repository.updated_at,
      }));

    return { repositories };
  }

  async scanRepositoryById(
    session: AppSession,
    repositoryIdRaw: string,
  ): Promise<RepositoryScanResponse> {
    const accessToken = this.requireGithubAccessToken(session);
    const repositoryId = Number.parseInt(repositoryIdRaw, 10);
    const scanType: ScanType = 'general';

    if (!Number.isInteger(repositoryId) || repositoryId <= 0) {
      throw new BadRequestException('Invalid repository id.');
    }

    const repository = await this.fetchRepositoryById(
      repositoryId,
      accessToken,
    );

    if (repository.private) {
      throw new ForbiddenException(
        'This MVP currently supports public repositories only.',
      );
    }

    const [owner, repoName] = repository.full_name.split('/');
    if (!owner || !repoName) {
      throw new BadGatewayException('Could not resolve repository ownership.');
    }

    const context: RepositoryScanContext = {
      accessToken,
      repository,
      owner,
      repoName,
      fullName: repository.full_name,
    };

    const [greenScanData, yellowScanData, redScanData] = await Promise.all([
      this.runGreenScan(context),
      this.runYellowScan(context),
      this.runRedScan(context),
    ]);

    const checks = [
      ...greenScanData.checks,
      ...yellowScanData.checks,
      ...redScanData.checks,
    ];

    const recommendations = this.uniqueRecommendations([
      ...greenScanData.recommendations,
      ...yellowScanData.recommendations,
      ...redScanData.recommendations,
    ]);

    const contextProfile = inferRepositoryContext(checks, repository.full_name);
    const didacticChecks = buildDidacticChecks(checks, contextProfile).map(
      (item) => ({
        checkId: item.check_id,
        label: item.label,
        status: item.status,
        confidence: item.confidence,
        whatChecked: item.what_checked,
        whyItMatters: item.why_it_matters,
        whatFound: item.what_found,
        suggestedAction: item.suggested_action,
        sources: item.sources,
        uncertaintyNote: item.uncertainty_note,
      }),
    );

    const highestSeverity = this.getHighestSeverity(
      checks.filter((check) => !check.passed),
    );

    return {
      scanType,
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
      },
      summary: {
        green: didacticChecks.filter((check) => check.status === 'green')
          .length,
        yellow: didacticChecks.filter((check) => check.status === 'yellow')
          .length,
        red: didacticChecks.filter((check) => check.status === 'red').length,
        highestSeverity,
      },
      context: contextProfile,
      checks,
      didacticChecks,
      recommendations,
    };
  }

  private async runGreenScan(context: RepositoryScanContext) {
    const [readmeExists, gitignoreExists, packageJsonExists, dependabotExists] =
      await Promise.all([
        this.pathExists({
          accessToken: context.accessToken,
          endpoint: `https://api.github.com/repos/${context.owner}/${context.repoName}/readme`,
        }),
        this.pathExists({
          accessToken: context.accessToken,
          endpoint: `https://api.github.com/repos/${context.owner}/${context.repoName}/contents/.gitignore`,
        }),
        this.pathExists({
          accessToken: context.accessToken,
          endpoint: `https://api.github.com/repos/${context.owner}/${context.repoName}/contents/package.json`,
        }),
        this.pathExists({
          accessToken: context.accessToken,
          endpoint: `https://api.github.com/repos/${context.owner}/${context.repoName}/contents/.github/dependabot.yml`,
        }),
      ]);

    const [
      workflowsExist,
      licenseExists,
      openIssuesCount,
      openPullRequestsCount,
    ] = await Promise.all([
      this.hasGithubActionsWorkflows(
        context.accessToken,
        context.owner,
        context.repoName,
      ),
      this.pathExists({
        accessToken: context.accessToken,
        endpoint: `https://api.github.com/repos/${context.owner}/${context.repoName}/license`,
      }),
      this.fetchOpenSearchCount(context.accessToken, context.fullName, 'issue'),
      this.fetchOpenSearchCount(context.accessToken, context.fullName, 'pr'),
    ]);

    const daysSinceLastPush = this.daysSince(context.repository.pushed_at);
    const recentActivity = daysSinceLastPush <= RECENT_ACTIVITY_DAYS;

    const checks: RepositoryCheckResult[] = [
      {
        key: 'readme',
        label: 'README',
        category: 'basic-health',
        passed: readmeExists,
        severity: 'medium',
        message: readmeExists
          ? 'README file found.'
          : 'README file was not found.',
      },
      {
        key: 'gitignore',
        label: '.gitignore',
        category: 'basic-health',
        passed: gitignoreExists,
        severity: 'low',
        message: gitignoreExists
          ? '.gitignore file found.'
          : '.gitignore file was not found.',
      },
      {
        key: 'packageJson',
        label: 'package.json',
        category: 'basic-health',
        passed: packageJsonExists,
        severity: 'low',
        message: packageJsonExists
          ? 'package.json file found.'
          : 'package.json file was not found.',
      },
      {
        key: 'dependabot',
        label: 'Dependabot',
        category: 'basic-security',
        passed: dependabotExists,
        severity: 'high',
        message: dependabotExists
          ? 'Dependabot configuration found.'
          : 'Dependabot configuration was not found.',
      },
      {
        key: 'githubActions',
        label: 'GitHub Actions',
        category: 'basic-security',
        passed: workflowsExist,
        severity: 'high',
        message: workflowsExist
          ? 'At least one GitHub Actions workflow was found.'
          : 'No GitHub Actions workflow was found.',
      },
      {
        key: 'license',
        label: 'LICENSE',
        category: 'basic-health',
        passed: licenseExists,
        severity: 'medium',
        message: licenseExists
          ? 'LICENSE file found.'
          : 'LICENSE file was not found.',
      },
      {
        key: 'recentActivity',
        label: 'Recent activity',
        category: 'activity',
        passed: recentActivity,
        severity: 'high',
        message: `Last push was ${daysSinceLastPush} day(s) ago.`,
      },
      {
        key: 'openIssues',
        label: 'Open issues',
        category: 'activity',
        passed: openIssuesCount <= ISSUE_THRESHOLD,
        severity: 'medium',
        message:
          openIssuesCount <= ISSUE_THRESHOLD
            ? `Open issues count is ${openIssuesCount}.`
            : `Open issues count is ${openIssuesCount}, above threshold ${ISSUE_THRESHOLD}.`,
      },
      {
        key: 'openPullRequests',
        label: 'Open pull requests',
        category: 'activity',
        passed: openPullRequestsCount <= PULL_REQUEST_THRESHOLD,
        severity: 'low',
        message:
          openPullRequestsCount <= PULL_REQUEST_THRESHOLD
            ? `Open pull requests count is ${openPullRequestsCount}.`
            : `Open pull requests count is ${openPullRequestsCount}, above threshold ${PULL_REQUEST_THRESHOLD}.`,
      },
    ];

    return {
      checks,
      recommendations: this.buildRecommendations(checks, daysSinceLastPush),
    };
  }

  private async runYellowScan(context: RepositoryScanContext) {
    const tree = await this.fetchRepositoryTree(context);
    const packageJsonText = await this.fetchTextFileByPath(
      context,
      'package.json',
    );
    const readmeText = await this.fetchReadmeText(context);

    const packageJsonData = this.parseJsonObject(packageJsonText);
    const scripts = this.extractScripts(packageJsonData);

    const scriptsExists = Object.keys(scripts).length > 0;
    const testScriptExists = this.hasScript(scripts, 'test');
    const buildScriptExists = this.hasScript(scripts, 'build');
    const lintScriptExists = this.hasScript(scripts, 'lint');

    const envExampleExists = this.treeHasExactPath(tree, '.env.example');
    const docsFolderExists = this.treeHasFolderPrefix(tree, 'docs/');
    const markdownBeyondReadme = tree.entries.some(
      (entry) =>
        entry.type === 'blob' &&
        entry.path.toLowerCase().endsWith('.md') &&
        !entry.path.toLowerCase().endsWith('readme.md'),
    );
    const docsStructureExists = docsFolderExists || markdownBeyondReadme;
    const srcFolderExists = this.treeHasFolderPrefix(tree, 'src/');
    const testsFolderExists =
      this.treeHasFolderPrefix(tree, 'test/') ||
      this.treeHasFolderPrefix(tree, 'tests/');
    const testFileExists = tree.entries.some(
      (entry) =>
        entry.type === 'blob' &&
        /\.(test|spec)\.(js|jsx|ts|tsx|mjs|cjs|py|go)$/i.test(entry.path),
    );
    const testsStructureExists = testsFolderExists || testFileExists;
    const lockfileExists = this.hasLockfile(tree);
    const readmeInstructionsExists = this.hasReadmeInstructions(readmeText);

    const checks: RepositoryCheckResult[] = [
      {
        key: 'scripts',
        label: 'Project scripts',
        category: 'maintainability',
        passed: scriptsExists,
        severity: 'medium',
        message: scriptsExists
          ? 'package.json contains scripts.'
          : 'package.json scripts were not found.',
      },
      {
        key: 'testScript',
        label: 'Test script',
        category: 'maintainability',
        passed: testScriptExists,
        severity: 'medium',
        message: testScriptExists
          ? 'A test script is configured.'
          : 'No test script was found in package.json.',
      },
      {
        key: 'buildScript',
        label: 'Build script',
        category: 'maintainability',
        passed: buildScriptExists,
        severity: 'low',
        message: buildScriptExists
          ? 'A build script is configured.'
          : 'No build script was found in package.json.',
      },
      {
        key: 'lintScript',
        label: 'Lint script',
        category: 'maintainability',
        passed: lintScriptExists,
        severity: 'low',
        message: lintScriptExists
          ? 'A lint script is configured.'
          : 'No lint script was found in package.json.',
      },
      {
        key: 'envExample',
        label: '.env.example',
        category: 'maintainability',
        passed: envExampleExists,
        severity: 'medium',
        message: envExampleExists
          ? '.env.example file found.'
          : '.env.example file was not found.',
      },
      {
        key: 'docsStructure',
        label: 'Documentation structure',
        category: 'maintainability',
        passed: docsStructureExists,
        severity: 'medium',
        message: docsStructureExists
          ? 'Additional documentation was found.'
          : 'No docs folder or extra documentation files were found.',
      },
      {
        key: 'srcFolder',
        label: 'Source folder',
        category: 'maintainability',
        passed: srcFolderExists,
        severity: 'low',
        message: srcFolderExists
          ? 'Source folder structure is present.'
          : 'No src folder was found.',
      },
      {
        key: 'testsStructure',
        label: 'Tests structure',
        category: 'maintainability',
        passed: testsStructureExists,
        severity: 'medium',
        message: testsStructureExists
          ? 'Test folder or test files were found.'
          : 'No test folder or test files were found.',
      },
      {
        key: 'lockfile',
        label: 'Package lockfile',
        category: 'maintainability',
        passed: lockfileExists,
        severity: 'low',
        message: lockfileExists
          ? 'A package manager lockfile was found.'
          : 'No package manager lockfile was found.',
      },
      {
        key: 'readmeInstructions',
        label: 'README setup instructions',
        category: 'maintainability',
        passed: readmeInstructionsExists,
        severity: 'medium',
        message: readmeInstructionsExists
          ? 'README appears to contain setup or run instructions.'
          : 'README does not appear to include setup/run instructions.',
      },
    ];

    return {
      checks,
      recommendations: this.buildRecommendations(checks, null),
    };
  }

  private async runRedScan(context: RepositoryScanContext) {
    const tree = await this.fetchRepositoryTree(context);
    const candidatePaths = this.getPatternScanCandidatePaths(tree);
    const fileContents = await this.fetchManyTextFiles(context, candidatePaths);
    const contentValues = Object.values(fileContents);

    const envExampleExists = this.treeHasExactPath(tree, '.env.example');
    const committedEnvExists = tree.entries.some(
      (entry) => entry.type === 'blob' && this.isCommittedEnvPath(entry.path),
    );

    const hardcodedSecretsFound = this.containsPattern(
      contentValues,
      /(?:api[_-]?key|client[_-]?secret|access[_-]?token|password|secret)\s*[:=]\s*['"][^'"\n]{8,}['"]/i,
    );

    const evalUsageFound = this.containsPatternForExtensions(
      fileContents,
      ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
      /\beval\s*\(/i,
    );

    const sqlConcatFound = this.containsPatternForExtensions(
      fileContents,
      ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
      /(?:select|insert|update|delete)[^;\n]*['"`]\s*\+\s*[a-z0-9_.]+/i,
    );

    const permissiveCorsFound = this.containsPattern(
      contentValues,
      /(?:enableCors|cors)\s*\([\s\S]{0,180}origin\s*:\s*['"`]\*['"`]/i,
    );

    const sensitiveConsoleLogFound = this.containsPatternForExtensions(
      fileContents,
      ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs'],
      /console\.(?:log|debug|info|warn|error)\s*\([^)]*(?:token|secret|password|api[_-]?key)[^)]*\)/i,
    );

    const hardcodedFrontendApiFound =
      this.containsPatternOnFrontendFiles(
        fileContents,
        /(?:VITE_API_URL|API_URL|BASE_URL)\s*[:=]\s*['"]https?:\/\/[^'"]+['"]/i,
      ) ||
      this.containsPatternOnFrontendFiles(
        fileContents,
        /(?:api[_-]?key|client[_-]?secret)\s*[:=]\s*['"][^'"\n]{8,}['"]/i,
      );

    const envUsageFound = this.containsPatternForExtensions(
      fileContents,
      ['.js', '.jsx', '.ts', '.tsx', '.mjs', '.cjs', '.py', '.go'],
      /(?:process\.env|import\.meta\.env)/i,
    );
    const envUsageWithoutExample = envUsageFound && !envExampleExists;

    const checks: RepositoryCheckResult[] = [
      {
        key: 'committedEnv',
        label: 'Committed .env files',
        category: 'security-pattern',
        passed: !committedEnvExists,
        severity: 'high',
        message: committedEnvExists
          ? 'Potential risk: committed .env-style files were found.'
          : 'No committed .env-style files were detected.',
      },
      {
        key: 'hardcodedSecrets',
        label: 'Hardcoded secret patterns',
        category: 'security-pattern',
        passed: !hardcodedSecretsFound,
        severity: 'high',
        message: hardcodedSecretsFound
          ? 'Potential risk: hardcoded secret-like patterns were detected.'
          : 'No hardcoded secret-like patterns were detected.',
      },
      {
        key: 'evalUsage',
        label: 'eval usage in JS/TS',
        category: 'security-pattern',
        passed: !evalUsageFound,
        severity: 'high',
        message: evalUsageFound
          ? 'Potential risk: eval usage was detected in JavaScript/TypeScript files.'
          : 'No eval usage was detected in JavaScript/TypeScript files.',
      },
      {
        key: 'sqlStringConcatenation',
        label: 'SQL string concatenation patterns',
        category: 'security-pattern',
        passed: !sqlConcatFound,
        severity: 'high',
        message: sqlConcatFound
          ? 'Potential risk: SQL string concatenation patterns were detected.'
          : 'No SQL string concatenation patterns were detected.',
      },
      {
        key: 'permissiveCors',
        label: 'Permissive CORS patterns',
        category: 'security-pattern',
        passed: !permissiveCorsFound,
        severity: 'medium',
        message: permissiveCorsFound
          ? "Potential risk: permissive CORS pattern with origin '*' was detected."
          : "No permissive CORS pattern with origin '*' was detected.",
      },
      {
        key: 'sensitiveConsoleLogs',
        label: 'Sensitive console log patterns',
        category: 'security-pattern',
        passed: !sensitiveConsoleLogFound,
        severity: 'medium',
        message: sensitiveConsoleLogFound
          ? 'Potential risk: console logs referencing sensitive keywords were detected.'
          : 'No sensitive console log patterns were detected.',
      },
      {
        key: 'hardcodedApiKeys',
        label: 'Hardcoded frontend API settings',
        category: 'security-pattern',
        passed: !hardcodedFrontendApiFound,
        severity: 'medium',
        message: hardcodedFrontendApiFound
          ? 'Potential risk: hardcoded frontend API URL/key patterns were detected.'
          : 'No hardcoded frontend API URL/key patterns were detected.',
      },
      {
        key: 'envUsageWithoutExample',
        label: 'Environment usage without .env.example',
        category: 'security-pattern',
        passed: !envUsageWithoutExample,
        severity: 'medium',
        message: envUsageWithoutExample
          ? 'Potential risk: environment variable usage was detected without .env.example.'
          : 'Environment variable usage appears aligned with .env.example guidance.',
      },
    ];

    return {
      checks,
      recommendations: this.buildRecommendations(checks, null),
    };
  }

  private requireGithubAccessToken(session: AppSession) {
    const accessToken = session.githubAccessToken;
    const githubUser = session.githubUser;

    if (!accessToken || !githubUser) {
      throw new UnauthorizedException('Authentication required.');
    }

    return accessToken;
  }

  private async fetchRepositoryById(
    repositoryId: number,
    accessToken: string,
  ): Promise<GithubRepositoryDetails> {
    const response = await this.githubFetch(
      `https://api.github.com/repositories/${repositoryId}`,
      accessToken,
    );

    if (response.status === 404) {
      throw new NotFoundException('Repository not found.');
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    return (await response.json()) as GithubRepositoryDetails;
  }

  private async fetchRepositoryTree(
    context: RepositoryScanContext,
  ): Promise<RepositoryTreeData> {
    const endpoint = new URL(
      `https://api.github.com/repos/${context.owner}/${context.repoName}/git/trees/${encodeURIComponent(context.repository.default_branch)}`,
    );
    endpoint.searchParams.set('recursive', '1');

    const response = await this.githubFetch(endpoint, context.accessToken);

    if (response.status === 409) {
      return {
        entries: [],
        pathSet: new Set<string>(),
        lowerPathSet: new Set<string>(),
      };
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    const payload = (await response.json()) as GithubTreeResponse;
    const entries = Array.isArray(payload.tree) ? payload.tree : [];
    const pathSet = new Set<string>(entries.map((entry) => entry.path));
    const lowerPathSet = new Set<string>(
      entries.map((entry) => entry.path.toLowerCase()),
    );

    return {
      entries,
      pathSet,
      lowerPathSet,
    };
  }

  private treeHasExactPath(tree: RepositoryTreeData, path: string): boolean {
    return tree.lowerPathSet.has(path.toLowerCase());
  }

  private treeHasFolderPrefix(
    tree: RepositoryTreeData,
    prefix: string,
  ): boolean {
    const lowerPrefix = prefix.toLowerCase();
    return tree.entries.some((entry) =>
      entry.path.toLowerCase().startsWith(lowerPrefix),
    );
  }

  private hasLockfile(tree: RepositoryTreeData): boolean {
    const lockfiles = [
      'package-lock.json',
      'yarn.lock',
      'pnpm-lock.yaml',
      'bun.lockb',
      'npm-shrinkwrap.json',
    ];

    return lockfiles.some((fileName) => this.treeHasExactPath(tree, fileName));
  }

  private hasReadmeInstructions(readmeText: string | null): boolean {
    if (!readmeText) {
      return false;
    }

    return /(getting started|setup|install|npm run|yarn|pnpm|run locally|how to run)/i.test(
      readmeText,
    );
  }

  private extractScripts(
    packageJsonData: Record<string, unknown> | null,
  ): Record<string, unknown> {
    if (!packageJsonData || typeof packageJsonData !== 'object') {
      return {};
    }

    const scriptsValue = packageJsonData['scripts'];
    if (!scriptsValue || typeof scriptsValue !== 'object') {
      return {};
    }

    return scriptsValue as Record<string, unknown>;
  }

  private hasScript(
    scripts: Record<string, unknown>,
    scriptName: string,
  ): boolean {
    const scriptValue = scripts[scriptName];
    return typeof scriptValue === 'string' && scriptValue.trim().length > 0;
  }

  private parseJsonObject(text: string | null): Record<string, unknown> | null {
    if (!text) {
      return null;
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, unknown>;
      }
      return null;
    } catch {
      return null;
    }
  }

  private async fetchReadmeText(
    context: RepositoryScanContext,
  ): Promise<string | null> {
    const response = await this.githubFetch(
      `https://api.github.com/repos/${context.owner}/${context.repoName}/readme`,
      context.accessToken,
    );

    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    const payload = (await response.json()) as GithubContentFileResponse;
    if (!payload.content) {
      return null;
    }

    if (payload.encoding === 'base64') {
      return Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString(
        'utf8',
      );
    }

    return payload.content;
  }

  private async fetchTextFileByPath(
    context: RepositoryScanContext,
    path: string,
  ): Promise<string | null> {
    const encodedPath = path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/');
    const endpoint = `https://api.github.com/repos/${context.owner}/${context.repoName}/contents/${encodedPath}`;

    const response = await this.githubFetch(endpoint, context.accessToken);
    if (response.status === 404) {
      return null;
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    const payload = (await response.json()) as GithubContentFileResponse | null;
    if (!payload || payload.type !== 'file') {
      return null;
    }

    if (payload.encoding === 'base64' && payload.content) {
      return Buffer.from(payload.content.replace(/\n/g, ''), 'base64').toString(
        'utf8',
      );
    }

    return typeof payload.content === 'string' ? payload.content : null;
  }

  private getPatternScanCandidatePaths(tree: RepositoryTreeData): string[] {
    const candidates = tree.entries
      .filter((entry) => entry.type === 'blob')
      .map((entry) => entry.path)
      .filter((path) => this.isPatternScanCandidate(path))
      .sort((a, b) => a.localeCompare(b))
      .slice(0, MAX_PATTERN_SCAN_FILES);

    return candidates;
  }

  private isPatternScanCandidate(path: string): boolean {
    const lowerPath = path.toLowerCase();

    if (
      lowerPath.includes('node_modules/') ||
      lowerPath.includes('dist/') ||
      lowerPath.includes('build/') ||
      lowerPath.includes('.min.')
    ) {
      return false;
    }

    return TEXT_FILE_EXTENSIONS.some((extension) =>
      lowerPath.endsWith(extension),
    );
  }

  private async fetchManyTextFiles(
    context: RepositoryScanContext,
    paths: string[],
  ): Promise<Record<string, string>> {
    const results: Record<string, string> = {};

    for (const path of paths) {
      const content = await this.fetchTextFileByPath(context, path);
      if (content !== null) {
        results[path] = content;
      }
    }

    return results;
  }

  private isCommittedEnvPath(path: string): boolean {
    const lowerPath = path.toLowerCase();
    const envLikeFile = /(^|\/)\.env($|[.][^/]+$)/i.test(lowerPath);
    const envExampleFile = /(^|\/)\.env\.example$/i.test(lowerPath);
    return envLikeFile && !envExampleFile;
  }

  private containsPattern(values: string[], pattern: RegExp): boolean {
    return values.some((value) => pattern.test(value));
  }

  private containsPatternForExtensions(
    fileContents: Record<string, string>,
    extensions: string[],
    pattern: RegExp,
  ): boolean {
    return Object.entries(fileContents).some(([path, content]) => {
      const lowerPath = path.toLowerCase();
      const extensionMatch = extensions.some((extension) =>
        lowerPath.endsWith(extension),
      );
      return extensionMatch && pattern.test(content);
    });
  }

  private containsPatternOnFrontendFiles(
    fileContents: Record<string, string>,
    pattern: RegExp,
  ): boolean {
    return Object.entries(fileContents).some(([path, content]) => {
      const lowerPath = path.toLowerCase();
      const frontendScope =
        lowerPath.startsWith('frontend/') ||
        lowerPath.startsWith('src/') ||
        lowerPath.includes('/src/') ||
        lowerPath.includes('/client/');

      return frontendScope && pattern.test(content);
    });
  }

  private async pathExists({
    endpoint,
    accessToken,
  }: {
    endpoint: string;
    accessToken: string;
  }): Promise<boolean> {
    const response = await this.githubFetch(endpoint, accessToken);

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    return true;
  }

  private async hasGithubActionsWorkflows(
    accessToken: string,
    owner: string,
    repoName: string,
  ): Promise<boolean> {
    const response = await this.githubFetch(
      `https://api.github.com/repos/${owner}/${repoName}/actions/workflows?per_page=1`,
      accessToken,
    );

    if (response.status === 404) {
      return false;
    }

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    const payload = (await response.json()) as { total_count?: number } | null;
    return Number(payload?.total_count ?? 0) > 0;
  }

  private async fetchOpenSearchCount(
    accessToken: string,
    fullName: string,
    type: 'issue' | 'pr',
  ): Promise<number> {
    const endpoint = new URL('https://api.github.com/search/issues');
    endpoint.searchParams.set('q', `repo:${fullName} is:${type} is:open`);
    endpoint.searchParams.set('per_page', '1');

    const response = await this.githubFetch(endpoint, accessToken);

    if (!response.ok) {
      this.throwGithubError(response.status);
    }

    const payload = (await response.json()) as { total_count?: number } | null;
    return Number(payload?.total_count ?? 0);
  }

  private getHighestSeverity(
    failedChecks: RepositoryCheckResult[],
  ): ScanSeverity {
    if (!failedChecks.length) {
      return 'none';
    }

    if (failedChecks.some((check) => check.severity === 'high')) {
      return 'high';
    }

    if (failedChecks.some((check) => check.severity === 'medium')) {
      return 'medium';
    }

    return 'low';
  }

  private buildRecommendations(
    checks: RepositoryCheckResult[],
    daysSinceLastPush: number | null,
  ): RepositoryRecommendation[] {
    const failedChecks = checks.filter((check) => !check.passed);
    const recommendations: RepositoryRecommendation[] = [];

    for (const check of failedChecks) {
      if (check.key === 'dependabot') {
        recommendations.push({
          priority: 'high',
          title: 'Add Dependabot configuration',
          description:
            'Dependabot helps identify vulnerable dependencies automatically.',
        });
      }

      if (check.key === 'githubActions') {
        recommendations.push({
          priority: 'high',
          title: 'Add a GitHub Actions workflow',
          description:
            'Automated workflows improve build quality and security validation.',
        });
      }

      if (check.key === 'recentActivity') {
        recommendations.push({
          priority:
            daysSinceLastPush !== null &&
            daysSinceLastPush > INACTIVE_ACTIVITY_DAYS
              ? 'high'
              : 'medium',
          title: 'Increase repository maintenance activity',
          description:
            'Regular updates reduce maintenance risk and keep dependencies current.',
        });
      }

      if (check.key === 'readme') {
        recommendations.push({
          priority: 'medium',
          title: 'Add a repository README',
          description:
            'A README improves project clarity, onboarding, and maintenance continuity.',
        });
      }

      if (check.key === 'license') {
        recommendations.push({
          priority: 'medium',
          title: 'Add a LICENSE file',
          description:
            'A license clarifies reuse rights and legal boundaries for contributors.',
        });
      }

      if (check.key === 'openIssues') {
        recommendations.push({
          priority: 'medium',
          title: 'Triage open issues',
          description:
            'Reducing stale issues helps maintain project health and delivery focus.',
        });
      }

      if (check.key === 'gitignore') {
        recommendations.push({
          priority: 'low',
          title: 'Add a .gitignore file',
          description:
            'Ignoring generated files prevents noise and accidental commits.',
        });
      }

      if (check.key === 'packageJson') {
        recommendations.push({
          priority: 'low',
          title: 'Add package.json metadata',
          description:
            'Project metadata and scripts support automation and dependency management.',
        });
      }

      if (check.key === 'openPullRequests') {
        recommendations.push({
          priority: 'low',
          title: 'Review open pull requests',
          description:
            'Reducing long-lived pull requests helps keep change flow healthy.',
        });
      }

      if (check.key === 'scripts') {
        recommendations.push({
          priority: 'medium',
          title: 'Add project scripts to package.json',
          description:
            'Consistent scripts improve maintainability and developer onboarding.',
        });
      }

      if (check.key === 'testScript' || check.key === 'testsStructure') {
        recommendations.push({
          priority: 'medium',
          title: 'Improve test setup',
          description:
            'Add test scripts and test structure to strengthen maintainability.',
        });
      }

      if (check.key === 'buildScript' || check.key === 'lintScript') {
        recommendations.push({
          priority: 'low',
          title: 'Add build and lint automation',
          description:
            'Build and lint scripts help preserve quality during development.',
        });
      }

      if (check.key === 'docsStructure' || check.key === 'readmeInstructions') {
        recommendations.push({
          priority: 'medium',
          title: 'Improve developer documentation',
          description:
            'Document setup and usage steps to support maintainability over time.',
        });
      }

      if (
        check.key === 'envExample' ||
        check.key === 'envUsageWithoutExample'
      ) {
        recommendations.push({
          priority: 'medium',
          title: 'Provide environment variable templates',
          description:
            'Use .env.example to document required environment variables safely.',
        });
      }

      if (check.key === 'lockfile') {
        recommendations.push({
          priority: 'low',
          title: 'Commit a lockfile',
          description:
            'A lockfile improves build reproducibility and dependency consistency.',
        });
      }

      if (check.key === 'committedEnv') {
        recommendations.push({
          priority: 'high',
          title: 'Remove committed .env files',
          description:
            'Move secrets to environment configuration and keep .env files out of version control.',
        });
      }

      if (
        check.key === 'hardcodedSecrets' ||
        check.key === 'hardcodedApiKeys'
      ) {
        recommendations.push({
          priority: 'high',
          title: 'Replace hardcoded credentials',
          description:
            'Potential credential patterns should be moved to secure environment configuration.',
        });
      }

      if (check.key === 'evalUsage') {
        recommendations.push({
          priority: 'high',
          title: 'Review dynamic code execution usage',
          description:
            'Avoid eval where possible and prefer safer parsing or mapping strategies.',
        });
      }

      if (check.key === 'sqlStringConcatenation') {
        recommendations.push({
          priority: 'high',
          title: 'Use parameterized database queries',
          description:
            'Potential SQL string concatenation should be replaced with parameterized queries.',
        });
      }

      if (check.key === 'permissiveCors') {
        recommendations.push({
          priority: 'medium',
          title: 'Restrict CORS origin configuration',
          description:
            'Avoid wildcard origins in production and allow only trusted frontend origins.',
        });
      }

      if (check.key === 'sensitiveConsoleLogs') {
        recommendations.push({
          priority: 'medium',
          title: 'Sanitize logs containing sensitive terms',
          description:
            'Review console logs to avoid exposing tokens, passwords, or secret-like values.',
        });
      }
    }

    return this.uniqueRecommendations(recommendations);
  }

  private uniqueRecommendations(
    recommendations: RepositoryRecommendation[],
  ): RepositoryRecommendation[] {
    const seen = new Set<string>();
    const unique: RepositoryRecommendation[] = [];

    for (const item of recommendations) {
      const key = `${item.priority}|${item.title}`;
      if (seen.has(key)) {
        continue;
      }

      seen.add(key);
      unique.push(item);
    }

    return unique;
  }

  private daysSince(isoDate: string): number {
    const date = new Date(isoDate);

    if (Number.isNaN(date.getTime())) {
      return Number.MAX_SAFE_INTEGER;
    }

    const diffMs = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }

  private throwGithubError(statusCode: number): never {
    if (statusCode === 401 || statusCode === 403) {
      throw new UnauthorizedException(
        'GitHub session expired. Please reconnect.',
      );
    }

    if (statusCode === 404) {
      throw new NotFoundException('GitHub resource not found.');
    }

    throw new BadGatewayException('GitHub API request failed.');
  }

  private githubFetch(input: string | URL, accessToken: string) {
    return fetch(input, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'RepoGuard',
      },
    });
  }
}
