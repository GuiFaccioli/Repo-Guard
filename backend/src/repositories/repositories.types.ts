export interface GithubRepositoryResponse {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  description: string | null;
  language: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  default_branch: string;
  stargazers_count: number;
  forks_count: number;
  open_issues_count: number;
  pushed_at: string;
  updated_at: string;
}

export interface GithubRepositoryDetails {
  id: number;
  name: string;
  full_name: string;
  html_url: string;
  private: boolean;
  pushed_at: string;
  open_issues_count: number;
}

export interface RepositoryListItem {
  id: number;
  name: string;
  fullName: string;
  htmlUrl: string;
  description: string | null;
  language: string | null;
  private: boolean;
  fork: boolean;
  archived: boolean;
  defaultBranch: string;
  stars: number;
  forks: number;
  openIssues: number;
  pushedAt: string;
  updatedAt: string;
}

export interface ListRepositoriesResponse {
  repositories: RepositoryListItem[];
}

export type ScanSeverity = 'high' | 'medium' | 'low' | 'none';

export interface RepositoryCheckResult {
  key:
    | 'readme'
    | 'gitignore'
    | 'packageJson'
    | 'dependabot'
    | 'githubActions'
    | 'license'
    | 'recentActivity'
    | 'openIssues'
    | 'openPullRequests';
  label: string;
  passed: boolean;
  severity: Exclude<ScanSeverity, 'none'>;
  message: string;
}

export interface RepositoryRecommendation {
  priority: Exclude<ScanSeverity, 'none'>;
  title: string;
  description: string;
}

export interface RepositoryScanResponse {
  repository: {
    id: number;
    name: string;
    fullName: string;
    htmlUrl: string;
  };
  score: number;
  summary: {
    passed: number;
    failed: number;
    highestSeverity: ScanSeverity;
  };
  checks: RepositoryCheckResult[];
  recommendations: RepositoryRecommendation[];
}
