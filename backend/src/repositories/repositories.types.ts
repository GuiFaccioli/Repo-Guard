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
  default_branch: string;
  pushed_at: string;
  open_issues_count: number;
}

export interface GithubTreeEntry {
  path: string;
  mode: string;
  type: 'blob' | 'tree';
  size?: number;
  sha: string;
  url: string;
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

export type ScanType = 'general';
export type ScanSeverity = 'high' | 'medium' | 'low' | 'none';
export type DidacticStatus = 'green' | 'yellow' | 'red';
export type DidacticConfidence = 'high' | 'medium' | 'low';
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
  checkId: RepositoryCheckResult['key'];
  label: string;
  status: DidacticStatus;
  confidence: DidacticConfidence;
  whatChecked: string;
  whyItMatters: string;
  whatFound: string;
  suggestedAction: string;
  sources: SourceReference[];
  uncertaintyNote?: string;
}

export interface RepositoryContextProfile {
  primary: RepositoryContextKind;
  secondary: RepositoryContextKind[];
  confidence: DidacticConfidence;
  signals: string[];
}
export type ScanCategory =
  | 'basic-health'
  | 'basic-security'
  | 'activity'
  | 'maintainability'
  | 'security-pattern';

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
    | 'openPullRequests'
    | 'scripts'
    | 'testScript'
    | 'buildScript'
    | 'lintScript'
    | 'envExample'
    | 'docsStructure'
    | 'srcFolder'
    | 'testsStructure'
    | 'lockfile'
    | 'readmeInstructions'
    | 'committedEnv'
    | 'hardcodedSecrets'
    | 'evalUsage'
    | 'sqlStringConcatenation'
    | 'permissiveCors'
    | 'sensitiveConsoleLogs'
    | 'hardcodedApiKeys'
    | 'envUsageWithoutExample';
  label: string;
  category: ScanCategory;
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
  scanType: ScanType;
  repository: {
    id: number;
    name: string;
    fullName: string;
    htmlUrl: string;
  };
  summary: {
    green: number;
    yellow: number;
    red: number;
    highestSeverity: ScanSeverity;
  };
  context: RepositoryContextProfile;
  checks: RepositoryCheckResult[];
  didacticChecks: DidacticCheckResult[];
  recommendations: RepositoryRecommendation[];
}
