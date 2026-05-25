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
  ListRepositoriesResponse,
  RepositoryCheckResult,
  RepositoryRecommendation,
  RepositoryScanResponse,
  ScanSeverity,
} from './repositories.types';

type AppSession = Session & Partial<SessionData>;

const SCORE_WEIGHTS = {
  readme: 10,
  gitignore: 8,
  packageJson: 8,
  dependabot: 15,
  githubActions: 15,
  license: 10,
  recentActivity: 14,
  openIssues: 10,
  openPullRequests: 10,
} as const;

const ISSUE_THRESHOLD = 25;
const PULL_REQUEST_THRESHOLD = 10;
const RECENT_ACTIVITY_DAYS = 90;
const INACTIVE_ACTIVITY_DAYS = 180;

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

    if (!Number.isInteger(repositoryId) || repositoryId <= 0) {
      throw new BadRequestException('Invalid repository id.');
    }

    const repository = await this.fetchRepositoryById(repositoryId, accessToken);

    if (repository.private) {
      throw new ForbiddenException(
        'This MVP currently supports public repositories only.',
      );
    }

    const [owner, repoName] = repository.full_name.split('/');
    if (!owner || !repoName) {
      throw new BadGatewayException('Could not resolve repository ownership.');
    }

    const [readmeExists, gitignoreExists, packageJsonExists, dependabotExists] =
      await Promise.all([
        this.pathExists({
          accessToken,
          endpoint: `https://api.github.com/repos/${owner}/${repoName}/readme`,
        }),
        this.pathExists({
          accessToken,
          endpoint: `https://api.github.com/repos/${owner}/${repoName}/contents/.gitignore`,
        }),
        this.pathExists({
          accessToken,
          endpoint: `https://api.github.com/repos/${owner}/${repoName}/contents/package.json`,
        }),
        this.pathExists({
          accessToken,
          endpoint: `https://api.github.com/repos/${owner}/${repoName}/contents/.github/dependabot.yml`,
        }),
      ]);

    const [workflowsExist, licenseExists, openIssuesCount, openPullRequestsCount] =
      await Promise.all([
        this.hasGithubActionsWorkflows(accessToken, owner, repoName),
        this.pathExists({
          accessToken,
          endpoint: `https://api.github.com/repos/${owner}/${repoName}/license`,
        }),
        this.fetchOpenSearchCount(accessToken, repository.full_name, 'issue'),
        this.fetchOpenSearchCount(accessToken, repository.full_name, 'pr'),
      ]);

    const daysSinceLastPush = this.daysSince(repository.pushed_at);
    const recentActivity = daysSinceLastPush <= RECENT_ACTIVITY_DAYS;

    const checks: RepositoryCheckResult[] = [
      {
        key: 'readme',
        label: 'README',
        passed: readmeExists,
        severity: 'medium',
        message: readmeExists
          ? 'README file found.'
          : 'README file was not found.',
      },
      {
        key: 'gitignore',
        label: '.gitignore',
        passed: gitignoreExists,
        severity: 'low',
        message: gitignoreExists
          ? '.gitignore file found.'
          : '.gitignore file was not found.',
      },
      {
        key: 'packageJson',
        label: 'package.json',
        passed: packageJsonExists,
        severity: 'low',
        message: packageJsonExists
          ? 'package.json file found.'
          : 'package.json file was not found.',
      },
      {
        key: 'dependabot',
        label: 'Dependabot',
        passed: dependabotExists,
        severity: 'high',
        message: dependabotExists
          ? 'Dependabot configuration found.'
          : 'Dependabot configuration was not found.',
      },
      {
        key: 'githubActions',
        label: 'GitHub Actions',
        passed: workflowsExist,
        severity: 'high',
        message: workflowsExist
          ? 'At least one GitHub Actions workflow was found.'
          : 'No GitHub Actions workflow was found.',
      },
      {
        key: 'license',
        label: 'LICENSE',
        passed: licenseExists,
        severity: 'medium',
        message: licenseExists
          ? 'LICENSE file found.'
          : 'LICENSE file was not found.',
      },
      {
        key: 'recentActivity',
        label: 'Recent activity',
        passed: recentActivity,
        severity: 'high',
        message: recentActivity
          ? `Last push was ${daysSinceLastPush} day(s) ago.`
          : `Last push was ${daysSinceLastPush} day(s) ago.`,
      },
      {
        key: 'openIssues',
        label: 'Open issues',
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
        passed: openPullRequestsCount <= PULL_REQUEST_THRESHOLD,
        severity: 'low',
        message:
          openPullRequestsCount <= PULL_REQUEST_THRESHOLD
            ? `Open pull requests count is ${openPullRequestsCount}.`
            : `Open pull requests count is ${openPullRequestsCount}, above threshold ${PULL_REQUEST_THRESHOLD}.`,
      },
    ];

    const score = this.calculateScore(checks);
    const failedChecks = checks.filter((check) => !check.passed);
    const highestSeverity = this.getHighestSeverity(failedChecks);
    const recommendations = this.buildRecommendations(failedChecks, daysSinceLastPush);

    return {
      repository: {
        id: repository.id,
        name: repository.name,
        fullName: repository.full_name,
        htmlUrl: repository.html_url,
      },
      score,
      summary: {
        passed: checks.filter((check) => check.passed).length,
        failed: failedChecks.length,
        highestSeverity,
      },
      checks,
      recommendations,
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

  private calculateScore(checks: RepositoryCheckResult[]): number {
    let score = 0;

    for (const check of checks) {
      if (!check.passed) {
        continue;
      }

      if (check.key === 'readme') score += SCORE_WEIGHTS.readme;
      if (check.key === 'gitignore') score += SCORE_WEIGHTS.gitignore;
      if (check.key === 'packageJson') score += SCORE_WEIGHTS.packageJson;
      if (check.key === 'dependabot') score += SCORE_WEIGHTS.dependabot;
      if (check.key === 'githubActions') score += SCORE_WEIGHTS.githubActions;
      if (check.key === 'license') score += SCORE_WEIGHTS.license;
      if (check.key === 'recentActivity') score += SCORE_WEIGHTS.recentActivity;
      if (check.key === 'openIssues') score += SCORE_WEIGHTS.openIssues;
      if (check.key === 'openPullRequests') score += SCORE_WEIGHTS.openPullRequests;
    }

    return Math.max(0, Math.min(100, score));
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
    failedChecks: RepositoryCheckResult[],
    daysSinceLastPush: number,
  ): RepositoryRecommendation[] {
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
          priority: daysSinceLastPush > INACTIVE_ACTIVITY_DAYS ? 'high' : 'medium',
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
    }

    return recommendations;
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
      throw new UnauthorizedException('GitHub session expired. Please reconnect.');
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
