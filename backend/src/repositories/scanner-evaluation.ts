import type { RepositoryCheckResult } from './repositories.types';

export type DidacticStatus = 'green' | 'yellow' | 'red';
export type ConfidenceLevel = 'high' | 'medium' | 'low';
export type RepositoryContextKind =
  | 'fullstack-app'
  | 'library-sdk'
  | 'scientific'
  | 'automation'
  | 'unknown';

export interface SourceReference {
  title: string;
  url: string;
  sourceType: 'official' | 'community' | 'specification';
}

export interface DidacticCheckResult {
  check_id: RepositoryCheckResult['key'];
  label: string;
  status: DidacticStatus;
  confidence: ConfidenceLevel;
  what_checked: string;
  why_it_matters: string;
  what_found: string;
  suggested_action: string;
  sources: SourceReference[];
  uncertainty_note?: string;
}

export interface RepositoryContext {
  primary: RepositoryContextKind;
  secondary: RepositoryContextKind[];
  confidence: ConfidenceLevel;
  signals: string[];
}

const SOURCE_CATALOG: Record<RepositoryCheckResult['key'], SourceReference[]> =
  {
    readme: [
      {
        title: 'GitHub Docs: About READMEs',
        url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
        sourceType: 'official',
      },
    ],
    gitignore: [
      {
        title: 'GitHub Docs: Ignoring files',
        url: 'https://docs.github.com/en/get-started/git-basics/ignoring-files',
        sourceType: 'official',
      },
    ],
    packageJson: [
      {
        title: 'npm Docs: package.json',
        url: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-json',
        sourceType: 'official',
      },
    ],
    dependabot: [
      {
        title: 'GitHub Docs: Dependabot configuration options',
        url: 'https://docs.github.com/en/code-security/dependabot/working-with-dependabot/dependabot-options-reference',
        sourceType: 'official',
      },
    ],
    githubActions: [
      {
        title: 'GitHub Docs: Understanding GitHub Actions',
        url: 'https://docs.github.com/en/actions/learn-github-actions/understanding-github-actions',
        sourceType: 'official',
      },
    ],
    license: [
      {
        title: 'GitHub Docs: Licensing a repository',
        url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/licensing-a-repository',
        sourceType: 'official',
      },
    ],
    recentActivity: [
      {
        title: 'Google SRE Book: Toil and reliability practices',
        url: 'https://sre.google/sre-book/eliminating-toil/',
        sourceType: 'community',
      },
    ],
    openIssues: [
      {
        title: 'GitHub Docs: About issues',
        url: 'https://docs.github.com/en/issues/tracking-your-work-with-issues/about-issues',
        sourceType: 'official',
      },
    ],
    openPullRequests: [
      {
        title: 'GitHub Docs: About pull requests',
        url: 'https://docs.github.com/en/pull-requests/collaborating-with-pull-requests/proposing-changes-with-pull-requests/about-pull-requests',
        sourceType: 'official',
      },
    ],
    scripts: [
      {
        title: 'npm Docs: scripts',
        url: 'https://docs.npmjs.com/cli/v10/using-npm/scripts',
        sourceType: 'official',
      },
    ],
    testScript: [
      {
        title: 'Testing Library docs',
        url: 'https://testing-library.com/docs/',
        sourceType: 'community',
      },
    ],
    buildScript: [
      {
        title: 'npm Docs: scripts',
        url: 'https://docs.npmjs.com/cli/v10/using-npm/scripts',
        sourceType: 'official',
      },
    ],
    lintScript: [
      {
        title: 'ESLint Docs',
        url: 'https://eslint.org/docs/latest/',
        sourceType: 'official',
      },
    ],
    envExample: [
      {
        title: 'OWASP: Secrets Management Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
        sourceType: 'community',
      },
    ],
    docsStructure: [
      {
        title: 'Write the Docs guide',
        url: 'https://www.writethedocs.org/guide/',
        sourceType: 'community',
      },
    ],
    srcFolder: [
      {
        title: 'Software Engineering at Google (code organization)',
        url: 'https://abseil.io/resources/swe-book',
        sourceType: 'community',
      },
    ],
    testsStructure: [
      {
        title: 'Jest Docs',
        url: 'https://jestjs.io/docs/getting-started',
        sourceType: 'official',
      },
    ],
    lockfile: [
      {
        title: 'npm Docs: package-lock.json',
        url: 'https://docs.npmjs.com/cli/v10/configuring-npm/package-lock-json',
        sourceType: 'official',
      },
    ],
    readmeInstructions: [
      {
        title: 'GitHub Docs: About READMEs',
        url: 'https://docs.github.com/en/repositories/managing-your-repositorys-settings-and-features/customizing-your-repository/about-readmes',
        sourceType: 'official',
      },
    ],
    committedEnv: [
      {
        title: 'GitHub Docs: Removing sensitive data',
        url: 'https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/removing-sensitive-data-from-a-repository',
        sourceType: 'official',
      },
      {
        title: 'OWASP: Secrets Management Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
        sourceType: 'community',
      },
    ],
    hardcodedSecrets: [
      {
        title: 'GitHub Docs: Secret scanning',
        url: 'https://docs.github.com/en/code-security/secret-scanning/about-secret-scanning',
        sourceType: 'official',
      },
      {
        title: 'OWASP: Secrets Management Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html',
        sourceType: 'community',
      },
    ],
    evalUsage: [
      {
        title: 'MDN: eval()',
        url: 'https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/eval',
        sourceType: 'official',
      },
    ],
    sqlStringConcatenation: [
      {
        title: 'OWASP: SQL Injection Prevention Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/SQL_Injection_Prevention_Cheat_Sheet.html',
        sourceType: 'community',
      },
    ],
    permissiveCors: [
      {
        title: 'MDN: CORS',
        url: 'https://developer.mozilla.org/en-US/docs/Web/HTTP/CORS',
        sourceType: 'official',
      },
    ],
    sensitiveConsoleLogs: [
      {
        title: 'OWASP: Logging Cheat Sheet',
        url: 'https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html',
        sourceType: 'community',
      },
    ],
    hardcodedApiKeys: [
      {
        title: 'Google Cloud: API key best practices',
        url: 'https://cloud.google.com/docs/authentication/api-keys-best-practices',
        sourceType: 'official',
      },
    ],
    envUsageWithoutExample: [
      {
        title: '12 Factor App: Config',
        url: 'https://12factor.net/config',
        sourceType: 'community',
      },
    ],
  };

export function inferRepositoryContext(
  checks: RepositoryCheckResult[],
  fullName: string,
): RepositoryContext {
  const lowered = fullName.toLowerCase();
  const hasNodeSignals = hasPassingSignal(checks, ['packageJson', 'scripts']);
  const hasCodeSafetySignals = hasFailedOrPassed(checks, [
    'hardcodedSecrets',
    'sqlStringConcatenation',
    'permissiveCors',
  ]);

  if (/(paper|thesis|research|study)/.test(lowered) && !hasNodeSignals) {
    return {
      primary: 'scientific',
      secondary: ['unknown'],
      confidence: 'medium',
      signals: ['name-paper-like'],
    };
  }

  if (hasNodeSignals && hasCodeSafetySignals) {
    return {
      primary: 'fullstack-app',
      secondary: ['library-sdk'],
      confidence: 'high',
      signals: ['package-json', 'security-patterns'],
    };
  }

  if (hasNodeSignals) {
    return {
      primary: 'library-sdk',
      secondary: ['automation'],
      confidence: 'medium',
      signals: ['package-json'],
    };
  }

  return {
    primary: 'unknown',
    secondary: [],
    confidence: 'low',
    signals: [],
  };
}

export function buildDidacticChecks(
  checks: RepositoryCheckResult[],
  context: RepositoryContext,
): DidacticCheckResult[] {
  return checks.map((check) => {
    const status = mapStatus(check.passed, check.severity, context.confidence);
    const confidence =
      context.confidence === 'low'
        ? 'low'
        : check.severity === 'high'
          ? 'high'
          : 'medium';
    const sources = SOURCE_CATALOG[check.key] || [];

    return {
      check_id: check.key,
      label: check.label,
      status,
      confidence,
      what_checked: `RepoGuard avaliou o item "${check.label}" no contexto ${context.primary}.`,
      why_it_matters:
        'Esse sinal ajuda a identificar riscos de manutenção, qualidade e segurança de forma prática.',
      what_found: check.message,
      suggested_action: check.passed
        ? 'Manter este padrão e revisar periodicamente.'
        : 'Revisar este ponto com base nas evidências e aplicar a melhoria sugerida.',
      sources: sources.length
        ? sources
        : [
            {
              title: 'OWASP Cheat Sheet Series',
              url: 'https://cheatsheetseries.owasp.org/',
              sourceType: 'community',
            },
          ],
      uncertainty_note:
        context.confidence === 'low'
          ? 'Confidence is low for this repository context. Please validate manually.'
          : undefined,
    };
  });
}

function hasFailedOrPassed(
  checks: RepositoryCheckResult[],
  keys: RepositoryCheckResult['key'][],
): boolean {
  return checks.some((check) => keys.includes(check.key));
}

function hasPassingSignal(
  checks: RepositoryCheckResult[],
  keys: RepositoryCheckResult['key'][],
): boolean {
  return checks.some((check) => keys.includes(check.key) && check.passed);
}

function mapStatus(
  passed: boolean,
  severity: RepositoryCheckResult['severity'],
  contextConfidence: ConfidenceLevel,
): DidacticStatus {
  if (passed) {
    return 'green';
  }

  if (contextConfidence === 'low' || severity === 'low') {
    return 'yellow';
  }

  return 'red';
}
