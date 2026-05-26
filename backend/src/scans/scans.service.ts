import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import {
  ParsedRepositoryTarget,
  ScanChecklistId,
  ScanChecklistItem,
  ScanChecklistResult,
  ScanProvider,
  ScanRepositoryResponse,
} from './scans.types';

interface NormalizedScanRequest {
  repositoryUrl: string;
  checklists: ScanChecklistId[];
}

interface RepositorySnapshot {
  defaultBranch: string;
  pushedAt: string | null;
  openIssuesCount: number | null;
  openPullRequestsCount: number | null;
  treePaths: string[];
  textSamples: Array<{ path: string; content: string }>;
}

interface FetchResponsePayload {
  [key: string]: unknown;
}

const SUPPORTED_CHECKLISTS: ScanChecklistId[] = [
  'good_practices',
  'security_basics',
];

const TEXT_FILE_EXTENSIONS = new Set([
  '.js',
  '.jsx',
  '.ts',
  '.tsx',
  '.mjs',
  '.cjs',
  '.json',
  '.yml',
  '.yaml',
  '.md',
  '.txt',
  '.py',
  '.go',
  '.java',
  '.rb',
  '.php',
  '.sh',
  '.toml',
  '.ini',
  '.cfg',
  '.env',
]);

const SECRET_VALUE_PATTERNS = [
  /ghp_[A-Za-z0-9]{20,}/i,
  /github_pat_[A-Za-z0-9_]{20,}/i,
  /sk_(?:live|test)_[A-Za-z0-9]{20,}/i,
  /AKIA[0-9A-Z]{16}/i,
  /AIza[0-9A-Za-z_-]{20,}/i,
  /-----BEGIN [A-Z ]+PRIVATE KEY-----/i,
  /\b(?:api[_-]?key|client[_-]?secret|secret|token|password)\b\s*[:=]/i,
];

const ISSUE_THRESHOLD = 25;
const PULL_REQUEST_THRESHOLD = 10;
const RECENT_ACTIVITY_DAYS = 90;
const MAX_SECURITY_SAMPLES = 24;

@Injectable()
export class ScansService {
  async runScan(
    repositoryUrlInput: unknown,
    checklistsInput: unknown,
  ): Promise<ScanRepositoryResponse> {
    try {
      const request = this.normalizeRequest(repositoryUrlInput, checklistsInput);
      const target = this.parseRepositoryUrl(request.repositoryUrl);
      const repositorySnapshot = await this.fetchRepositorySnapshot(target);

      const selectedResults: ScanChecklistResult[] = [];

      for (const checklist of request.checklists) {
        if (checklist === 'good_practices') {
          selectedResults.push(
            await this.buildGoodPracticesResult(target, repositorySnapshot),
          );
        }

        if (checklist === 'security_basics') {
          selectedResults.push(
            await this.buildSecurityBasicsResult(
              target,
              repositorySnapshot.treePaths,
              repositorySnapshot.textSamples,
            ),
          );
        }
      }

      return {
        repository: target,
        selectedChecklists: request.checklists,
        results: selectedResults,
      };
    } catch (error) {
      if (
        error instanceof BadRequestException ||
        error instanceof NotFoundException ||
        error instanceof UnprocessableEntityException
      ) {
        throw error;
      }

      throw new InternalServerErrorException(
        'Could not complete repository scan.',
      );
    }
  }

  private normalizeRequest(
    repositoryUrlInput: unknown,
    checklistsInput: unknown,
  ): NormalizedScanRequest {
    if (typeof repositoryUrlInput !== 'string' || !repositoryUrlInput.trim()) {
      throw new BadRequestException('repositoryUrl is required.');
    }

    if (!Array.isArray(checklistsInput) || !checklistsInput.length) {
      throw new BadRequestException('At least one checklist is required.');
    }

    const checklists = Array.from(
      new Set(
        checklistsInput.map((value) => this.normalizeChecklistValue(value)),
      ),
    );

    if (!checklists.length) {
      throw new BadRequestException('At least one checklist is required.');
    }

    for (const checklist of checklists) {
      if (!SUPPORTED_CHECKLISTS.includes(checklist)) {
        throw new BadRequestException(`Unsupported checklist: ${checklist}`);
      }
    }

    return {
      repositoryUrl: repositoryUrlInput.trim(),
      checklists,
    };
  }

  private normalizeChecklistValue(value: unknown): ScanChecklistId {
    if (value === 'good_practices' || value === 'security_basics') {
      return value;
    }

    throw new BadRequestException(`Unsupported checklist: ${String(value)}`);
  }

  private parseRepositoryUrl(repositoryUrl: string): ParsedRepositoryTarget {
    const parsed = this.tryParseUrl(repositoryUrl);
    const normalizedInput = repositoryUrl.trim();

    if (!parsed) {
      throw new BadRequestException('repositoryUrl is invalid.');
    }

    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    const pathnameSegments = this.extractRepositorySegments(parsed.pathname);

    if (host === 'github.com') {
      if (pathnameSegments.length < 2) {
        throw new UnprocessableEntityException(
          'GitHub repository URL could not be normalized.',
        );
      }

      const owner = pathnameSegments[0];
      const name = this.stripGitSuffix(pathnameSegments[1]);

      if (!owner || !name) {
        throw new UnprocessableEntityException(
          'GitHub repository URL could not be normalized.',
        );
      }

      return {
        provider: 'github',
        owner,
        name,
        url: `https://github.com/${owner}/${name}`,
      };
    }

    if (host === 'gitlab.com') {
      if (pathnameSegments.length < 2) {
        throw new UnprocessableEntityException(
          'GitLab repository URL could not be normalized.',
        );
      }

      const name = this.stripGitSuffix(pathnameSegments[pathnameSegments.length - 1]);
      const owner = pathnameSegments.slice(0, -1).join('/');

      if (!owner || !name) {
        throw new UnprocessableEntityException(
          'GitLab repository URL could not be normalized.',
        );
      }

      return {
        provider: 'gitlab',
        owner,
        name,
        url: `https://gitlab.com/${owner}/${name}`,
      };
    }

    if (host === 'bitbucket.org') {
      if (pathnameSegments.length < 2) {
        throw new UnprocessableEntityException(
          'Bitbucket repository URL could not be normalized.',
        );
      }

      const owner = pathnameSegments[0];
      const name = this.stripGitSuffix(pathnameSegments[1]);

      if (!owner || !name) {
        throw new UnprocessableEntityException(
          'Bitbucket repository URL could not be normalized.',
        );
      }

      return {
        provider: 'bitbucket',
        owner,
        name,
        url: `https://bitbucket.org/${owner}/${name}`,
      };
    }

    throw new UnprocessableEntityException(
      `Unsupported repository host: ${normalizedInput}`,
    );
  }

  private extractRepositorySegments(pathname: string): string[] {
    const reservedSegments = new Set([
      '-',
      'tree',
      'blob',
      'src',
      'raw',
      'issues',
      'merge_requests',
      'merge-requests',
      'pullrequests',
      'pull-requests',
    ]);

    const segments: string[] = [];

    for (const segment of pathname.split('/').filter(Boolean)) {
      const decodedSegment = decodeURIComponent(segment);
      if (reservedSegments.has(decodedSegment.toLowerCase())) {
        break;
      }

      segments.push(decodedSegment);
    }

    return segments;
  }

  private stripGitSuffix(value: string): string {
    return value.replace(/\.git$/i, '');
  }

  private tryParseUrl(repositoryUrl: string): URL | null {
    try {
      return new URL(repositoryUrl);
    } catch {
      const sshMatch = repositoryUrl.match(
        /^git@([^:]+):(.+?)(?:\.git)?(?:\/.*)?$/,
      );

      if (!sshMatch) {
        return null;
      }

      const [, host, path] = sshMatch;
      try {
        return new URL(`https://${host}/${path}`);
      } catch {
        return null;
      }
    }
  }

  private async fetchRepositorySnapshot(
    target: ParsedRepositoryTarget,
  ): Promise<RepositorySnapshot> {
    if (target.provider === 'github') {
      return this.fetchGithubSnapshot(target);
    }

    if (target.provider === 'gitlab') {
      return this.fetchGitlabSnapshot(target);
    }

    return this.fetchBitbucketSnapshot(target);
  }

  private async fetchGithubSnapshot(
    target: ParsedRepositoryTarget,
  ): Promise<RepositorySnapshot> {
    const repositoryResponse = await this.fetchJson(
      `https://api.github.com/repos/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`,
      {
        provider: 'github',
      },
    );

    const defaultBranch = this.readString(repositoryResponse, [
      'default_branch',
    ]) || 'main';
    const pushedAt = this.readString(repositoryResponse, ['pushed_at']);
    const treePaths = await this.fetchGithubTreePaths(
      target.owner,
      target.name,
      defaultBranch,
    );
    const [textSamples, openIssuesCount, openPullRequestsCount] =
      await Promise.all([
        this.collectTextSamples(target, defaultBranch, treePaths),
        this.fetchGithubSearchCount(target.owner, target.name, 'issue'),
        this.fetchGithubSearchCount(target.owner, target.name, 'pr'),
      ]);

    return {
      defaultBranch,
      pushedAt,
      openIssuesCount,
      openPullRequestsCount,
      treePaths,
      textSamples,
    };
  }

  private async fetchGitlabSnapshot(
    target: ParsedRepositoryTarget,
  ): Promise<RepositorySnapshot> {
    const projectPath = encodeURIComponent(`${target.owner}/${target.name}`);
    const repositoryResponse = await this.fetchJson(
      `https://gitlab.com/api/v4/projects/${projectPath}`,
      {
        provider: 'gitlab',
      },
    );

    const defaultBranch =
      this.readString(repositoryResponse, ['default_branch']) || 'main';
    const pushedAt =
      this.readString(repositoryResponse, ['last_activity_at']) ||
      this.readString(repositoryResponse, ['updated_at']);
    const openIssuesCount = this.readNumber(repositoryResponse, [
      'open_issues_count',
    ]);
    const openPullRequestsCount = await this.fetchGitlabMergeRequestCount(
      projectPath,
    );
    const treePaths = await this.fetchGitlabTreePaths(projectPath);
    const textSamples = await this.collectTextSamples(
      target,
      defaultBranch,
      treePaths,
    );

    return {
      defaultBranch,
      pushedAt,
      openIssuesCount,
      openPullRequestsCount,
      treePaths,
      textSamples,
    };
  }

  private async fetchBitbucketSnapshot(
    target: ParsedRepositoryTarget,
  ): Promise<RepositorySnapshot> {
    const repoPath = `${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`;
    const repositoryResponse = await this.fetchJson(
      `https://api.bitbucket.org/2.0/repositories/${repoPath}`,
      {
        provider: 'bitbucket',
      },
    );

    const defaultBranch =
      this.readString(repositoryResponse, ['mainbranch', 'name']) || 'main';
    const pushedAt =
      this.readString(repositoryResponse, ['updated_on']) ||
      this.readString(repositoryResponse, ['created_on']);
    const openIssuesCount = await this.fetchBitbucketIssueCount(repoPath);
    const openPullRequestsCount = await this.fetchBitbucketPullRequestCount(
      repoPath,
    );
    const treePaths = await this.fetchBitbucketTreePaths(repoPath, defaultBranch);
    const textSamples = await this.collectTextSamples(
      target,
      defaultBranch,
      treePaths,
    );

    return {
      defaultBranch,
      pushedAt,
      openIssuesCount,
      openPullRequestsCount,
      treePaths,
      textSamples,
    };
  }

  private async buildGoodPracticesResult(
    target: ParsedRepositoryTarget,
    repositorySnapshot: RepositorySnapshot,
  ): Promise<ScanChecklistResult> {
    const paths = new Set(
      repositorySnapshot.treePaths.map((path) => this.normalizePath(path)),
    );
    const checks: ScanChecklistItem[] = [];

    checks.push(
      this.buildPathPresenceCheck(
        'README exists',
        this.hasAnyPath(paths, ['README.md', 'README', 'readme.md', 'Readme.md']),
        'README file found in the repository tree.',
        'README file was not found in the repository tree.',
      ),
    );

    checks.push(
      this.buildPathPresenceCheck(
        '.gitignore exists',
        paths.has('.gitignore'),
        '.gitignore is present.',
        '.gitignore was not found.',
      ),
    );

    checks.push(
      this.buildPathPresenceCheck(
        'Package metadata is present',
        paths.has('package.json'),
        'package.json is present.',
        'package.json was not found.',
      ),
    );

    checks.push(
      this.buildPathPresenceCheck(
        'Dependency automation is configured',
        this.hasAnyPath(paths, [
          '.github/dependabot.yml',
          '.github/dependabot.yaml',
        ]),
        'Dependabot configuration was found.',
        'Dependabot configuration was not found.',
      ),
    );

    checks.push(
      this.buildPathPresenceCheck(
        'CI automation is configured',
        this.hasAnyPath(paths, [
          '.github/workflows',
          '.gitlab-ci.yml',
          'bitbucket-pipelines.yml',
          '.bitbucket-pipelines.yml',
        ]) ||
          Array.from(paths).some((path) =>
            path.startsWith('.github/workflows/'),
          ),
        'At least one automation file was found.',
        'No automation file was found.',
      ),
    );

    checks.push(
      this.buildPathPresenceCheck(
        'LICENSE file exists',
        this.hasAnyPath(paths, ['LICENSE', 'LICENSE.md', 'LICENSE.txt']),
        'A license file was found.',
        'A license file was not found.',
      ),
    );

    const pushedAt = repositorySnapshot.pushedAt;
    const daysSincePush = pushedAt ? this.daysSince(pushedAt) : null;
    const recentActivityPass =
      daysSincePush !== null && daysSincePush <= RECENT_ACTIVITY_DAYS;

    checks.push({
      label: 'Recent activity',
      status: recentActivityPass ? 'pass' : 'fail',
      details:
        daysSincePush === null
          ? 'The repository did not expose a last activity date.'
          : recentActivityPass
            ? `Last activity was ${daysSincePush} day(s) ago.`
            : `Last activity was ${daysSincePush} day(s) ago.`,
    });

    const openIssuesCount = repositorySnapshot.openIssuesCount;
    const openIssuesPass =
      openIssuesCount !== null && openIssuesCount <= ISSUE_THRESHOLD;

    checks.push({
      label: 'Open issues',
      status: openIssuesPass ? 'pass' : 'fail',
      details:
        openIssuesCount === null
          ? 'The repository did not expose an issue count.'
          : openIssuesPass
            ? `Open issues count is ${openIssuesCount}.`
            : `Open issues count is ${openIssuesCount}, above the baseline threshold of ${ISSUE_THRESHOLD}.`,
    });

    const openPullRequestsCount = repositorySnapshot.openPullRequestsCount;
    const openPullRequestsPass =
      openPullRequestsCount !== null &&
      openPullRequestsCount <= PULL_REQUEST_THRESHOLD;

    checks.push({
      label: 'Open pull requests',
      status: openPullRequestsPass ? 'pass' : 'fail',
      details:
        openPullRequestsCount === null
          ? 'The repository did not expose a pull request count.'
          : openPullRequestsPass
            ? `Open pull requests count is ${openPullRequestsCount}.`
            : `Open pull requests count is ${openPullRequestsCount}, above the baseline threshold of ${PULL_REQUEST_THRESHOLD}.`,
    });

    return {
      checklist: 'good_practices',
      title: 'Good practices',
      items: checks,
    };
  }

  private async buildSecurityBasicsResult(
    target: ParsedRepositoryTarget,
    treePathsInput: string[],
    textSamples: Array<{ path: string; content: string }>,
  ): Promise<ScanChecklistResult> {
    const paths = new Set(
      treePathsInput.map((path) => this.normalizePath(path)),
    );
    const textCorpus = textSamples
      .map((sample) => `${sample.path}\n${sample.content}`)
      .join('\n\n');
    const items: ScanChecklistItem[] = [];

    const secretFilePattern = Array.from(paths).some((path) =>
      /(^|\/)\.env(\.|$)|(^|\/)(?:credentials?|secrets?|id_rsa|id_dsa|private[_-]?key)(\.[^/]+)?$/i.test(
        path,
      ),
    );

    items.push({
      label: 'No obvious secret files detected',
      status: secretFilePattern ? 'fail' : 'pass',
      details: secretFilePattern
        ? 'A file name that looks sensitive was found in the repository tree.'
        : 'No obvious secret file names were found in the sampled repository tree.',
    });

    const hardcodedSecretPattern = SECRET_VALUE_PATTERNS.some((pattern) =>
      pattern.test(textCorpus),
    );

    items.push({
      label: 'No obvious hardcoded secret patterns detected',
      status: hardcodedSecretPattern ? 'fail' : 'pass',
      details: hardcodedSecretPattern
        ? 'The sampled files include a pattern that looks like a secret or credential.'
        : 'No obvious secret-like patterns were found in the sampled files.',
    });

    const evalPattern = /\beval\s*\(/i.test(textCorpus);
    items.push({
      label: 'No obvious eval usage detected',
      status: evalPattern ? 'fail' : 'pass',
      details: evalPattern
        ? 'A sampled file appears to use eval().'
        : 'No obvious eval() usage was found in the sampled files.',
    });

    const sqlConcatPattern = /\b(?:SELECT|INSERT|UPDATE|DELETE)\b[\s\S]{0,120}\+/i.test(
      textCorpus,
    );
    items.push({
      label: 'No obvious SQL string concatenation detected',
      status: sqlConcatPattern ? 'fail' : 'pass',
      details: sqlConcatPattern
        ? 'A sampled file appears to build a SQL query with string concatenation.'
        : 'No obvious SQL string concatenation was found in the sampled files.',
    });

    return {
      checklist: 'security_basics',
      title: 'Security basics',
      items,
    };
  }

  private buildPathPresenceCheck(
    label: string,
    passed: boolean,
    passDetails: string,
    failDetails: string,
  ): ScanChecklistItem {
    return {
      label,
      status: passed ? 'pass' : 'fail',
      details: passed ? passDetails : failDetails,
    };
  }

  private hasAnyPath(paths: Set<string>, candidates: string[]): boolean {
    return candidates.some((candidate) => {
      const normalizedCandidate = this.normalizePath(candidate);
      if (paths.has(normalizedCandidate)) {
        return true;
      }

      return Array.from(paths).some((path) => path.startsWith(`${normalizedCandidate}/`));
    });
  }

  private normalizePath(path: string): string {
    return path
      .split('/')
      .filter(Boolean)
      .join('/')
      .replace(/\/+/g, '/');
  }

  private async fetchGithubTreePaths(
    owner: string,
    repo: string,
    branch: string,
  ): Promise<string[]> {
    const response = await this.fetchJson(
      `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`,
      { provider: 'github' },
    );

    const tree = Array.isArray(response.tree) ? response.tree : [];
    return tree
      .map((entry) => this.readString(entry, ['path']))
      .filter((path): path is string => Boolean(path));
  }

  private async fetchGitlabTreePaths(projectPath: string): Promise<string[]> {
    const paths: string[] = [];
    let page = 1;

    while (page <= 10) {
      const response = await this.fetchJson(
        `https://gitlab.com/api/v4/projects/${projectPath}/repository/tree?recursive=true&per_page=100&page=${page}`,
        { provider: 'gitlab' },
      );

      if (!Array.isArray(response)) {
        break;
      }

      const batchPaths = response
        .map((entry) => this.readString(entry, ['path']))
        .filter((path): path is string => Boolean(path));

      paths.push(...batchPaths);

      if (response.length < 100) {
        break;
      }

      page += 1;
    }

    return paths;
  }

  private async fetchBitbucketTreePaths(
    repoPath: string,
    branch: string,
  ): Promise<string[]> {
    const paths: string[] = [];
    const visitedDirectories = new Set<string>();
    const pendingDirectories: string[] = [''];

    while (pendingDirectories.length) {
      const directory = pendingDirectories.shift() || '';
      const normalizedDirectory = directory.replace(/^\/+|\/+$/g, '');
      if (visitedDirectories.has(normalizedDirectory)) {
        continue;
      }

      visitedDirectories.add(normalizedDirectory);

      const encodedDirectory = normalizedDirectory
        .split('/')
        .filter(Boolean)
        .map((segment) => encodeURIComponent(segment))
        .join('/');

      let nextUrl: string | null = `https://api.bitbucket.org/2.0/repositories/${repoPath}/src/${encodeURIComponent(branch)}/${encodedDirectory ? `${encodedDirectory}/` : ''}?pagelen=100`;

      while (nextUrl) {
        const response = await this.fetchJson(nextUrl, {
          provider: 'bitbucket',
        });

        const values = Array.isArray(response?.values) ? response.values : [];
        for (const entry of values) {
          const path = this.readString(entry, ['path']);
          const entryType = this.readString(entry, ['type']);
          if (path) {
            paths.push(path);
          }

          if (entryType === 'commit_directory' && path) {
            pendingDirectories.push(path);
          }
        }

        nextUrl = this.readString(response, ['next']) || null;
      }
    }

    return paths;
  }

  private async collectTextSamples(
    target: ParsedRepositoryTarget,
    defaultBranch: string,
    treePaths: string[],
  ): Promise<Array<{ path: string; content: string }>> {
    const candidates = treePaths
      .map((path) => this.normalizePath(path))
      .filter((path) => this.shouldSamplePath(path))
      .slice(0, MAX_SECURITY_SAMPLES);

    const samples: Array<{ path: string; content: string }> = [];

    for (const path of candidates) {
      try {
        const content = await this.fetchFileText(target, defaultBranch, path);
        if (content) {
          samples.push({ path, content });
        }
      } catch {
        // Skip unreadable files to keep the scan resilient.
      }
    }

    return samples;
  }

  private shouldSamplePath(path: string): boolean {
    const lowerPath = path.toLowerCase();
    if (
      lowerPath.startsWith('dist/') ||
      lowerPath.startsWith('build/') ||
      lowerPath.startsWith('coverage/') ||
      lowerPath.startsWith('node_modules/') ||
      lowerPath.includes('/dist/') ||
      lowerPath.includes('/build/') ||
      lowerPath.includes('/coverage/')
    ) {
      return false;
    }

    if (path === 'package.json' || path === 'README.md' || path === '.gitignore') {
      return true;
    }

    if (/(^|\/)\.env(\.|$)/i.test(path)) {
      return true;
    }

    const dotFileMatch = /(^|\/)\.[^/]+$/i.test(path);
    if (dotFileMatch) {
      return true;
    }

    const extension = path.includes('.')
      ? `.${path.split('.').pop()?.toLowerCase() || ''}`
      : '';

    return TEXT_FILE_EXTENSIONS.has(extension);
  }

  private async fetchFileText(
    target: ParsedRepositoryTarget,
    branch: string,
    path: string,
  ): Promise<string> {
    if (target.provider === 'github') {
      const rawUrl = `https://raw.githubusercontent.com/${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}/${encodeURIComponent(branch)}/${path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('/')}`;
      return this.fetchText(rawUrl, { provider: 'github' });
    }

    if (target.provider === 'gitlab') {
      const projectPath = encodeURIComponent(`${target.owner}/${target.name}`);
      const encodedPath = path
        .split('/')
        .map((segment) => encodeURIComponent(segment))
        .join('%2F');
      const rawUrl = `https://gitlab.com/api/v4/projects/${projectPath}/repository/files/${encodedPath}/raw?ref=${encodeURIComponent(branch)}`;
      return this.fetchText(rawUrl, { provider: 'gitlab' });
    }

    const repoPath = `${encodeURIComponent(target.owner)}/${encodeURIComponent(target.name)}`;
    const rawUrl = `https://api.bitbucket.org/2.0/repositories/${repoPath}/src/${encodeURIComponent(branch)}/${path
      .split('/')
      .map((segment) => encodeURIComponent(segment))
      .join('/')}`;
    return this.fetchText(rawUrl, { provider: 'bitbucket' });
  }

  private async fetchGithubSearchCount(
    owner: string,
    repo: string,
    type: 'issue' | 'pr',
  ): Promise<number> {
    const queryType = type === 'issue' ? 'issue' : 'pr';
    const response = await this.fetchJson(
      `https://api.github.com/search/issues?q=repo:${encodeURIComponent(owner)}/${encodeURIComponent(repo)}+is:${queryType}+is:open&per_page=1`,
      { provider: 'github' },
    );

    return this.readNumber(response, ['total_count']) ?? 0;
  }

  private async fetchGitlabMergeRequestCount(
    projectPath: string,
  ): Promise<number> {
    const response = await fetch(
      `https://gitlab.com/api/v4/projects/${projectPath}/merge_requests?state=opened&per_page=1`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    this.handleProviderStatus(response.status, 'gitlab');

    const totalHeader = response.headers.get('x-total');
    if (totalHeader && Number.isFinite(Number(totalHeader))) {
      return Number(totalHeader);
    }

    const payload = await response.json().catch(() => []);
    return Array.isArray(payload) ? payload.length : 0;
  }

  private async fetchBitbucketIssueCount(repoPath: string): Promise<number> {
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${repoPath}/issues?pagelen=1&q=status="open"`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    this.handleProviderStatus(response.status, 'bitbucket');

    const payload = await response.json().catch(() => null);
    const size = this.readNumber(payload, ['size']);
    return size ?? 0;
  }

  private async fetchBitbucketPullRequestCount(
    repoPath: string,
  ): Promise<number> {
    const response = await fetch(
      `https://api.bitbucket.org/2.0/repositories/${repoPath}/pullrequests?pagelen=1&q=state="OPEN"`,
      {
        headers: {
          Accept: 'application/json',
        },
      },
    );

    this.handleProviderStatus(response.status, 'bitbucket');

    const payload = await response.json().catch(() => null);
    const size = this.readNumber(payload, ['size']);
    return size ?? 0;
  }

  private async fetchJson(
    url: string,
    options: { provider: ScanProvider },
  ): Promise<FetchResponsePayload> {
    const response = await fetch(url, {
      headers: this.buildHeaders(options.provider),
    });

    this.handleProviderStatus(response.status, options.provider);

    return response.json().catch(() => {
      throw new InternalServerErrorException(
        'Could not complete repository scan.',
      );
    });
  }

  private async fetchText(
    url: string,
    options: { provider: ScanProvider },
  ): Promise<string> {
    const response = await fetch(url, {
      headers: this.buildHeaders(options.provider),
    });

    this.handleProviderStatus(response.status, options.provider);

    return response.text();
  }

  private buildHeaders(provider: ScanProvider): Record<string, string> {
    if (provider === 'github') {
      return {
        Accept: 'application/vnd.github+json',
        'X-GitHub-Api-Version': '2022-11-28',
        'User-Agent': 'RepoGuard',
      };
    }

    return {
      Accept: 'application/json',
      'User-Agent': 'RepoGuard',
    };
  }

  private handleProviderStatus(status: number, provider: ScanProvider): void {
    if (status === 404 || status === 401 || status === 403) {
      throw new NotFoundException(
        `${provider} repository could not be found or accessed.`,
      );
    }

    if (status >= 500) {
      throw new InternalServerErrorException(
        `${provider} repository provider failed.`,
      );
    }
  }

  private readString(
    value: FetchResponsePayload | unknown,
    path: string[],
  ): string | null {
    let current: unknown = value;

    for (const key of path) {
      if (!current || typeof current !== 'object') {
        return null;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'string' ? current : null;
  }

  private readNumber(
    value: FetchResponsePayload | unknown,
    path: string[],
  ): number | null {
    let current: unknown = value;

    for (const key of path) {
      if (!current || typeof current !== 'object') {
        return null;
      }

      current = (current as Record<string, unknown>)[key];
    }

    return typeof current === 'number' && Number.isFinite(current)
      ? current
      : null;
  }

  private daysSince(isoDate: string): number {
    const date = new Date(isoDate);
    if (Number.isNaN(date.getTime())) {
      return Number.MAX_SAFE_INTEGER;
    }

    const diffMs = Date.now() - date.getTime();
    return Math.max(0, Math.floor(diffMs / (1000 * 60 * 60 * 24)));
  }
}
