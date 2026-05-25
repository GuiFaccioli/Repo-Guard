export interface GithubOAuthTokenResponse {
  access_token?: string;
  token_type?: string;
  scope?: string;
  error?: string;
  error_description?: string;
}

export interface GithubUserProfile {
  id: number;
  login: string;
  name: string | null;
  avatar_url: string;
  html_url: string;
}

export interface SessionGithubUser {
  githubId: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  htmlUrl: string;
}
