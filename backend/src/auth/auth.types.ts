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
}

export interface GithubUserEmail {
  email: string;
  primary: boolean;
  verified: boolean;
  visibility: 'public' | 'private' | null;
}

export interface SessionGithubUser {
  id: number;
  login: string;
  name: string | null;
  avatarUrl: string;
  email: string | null;
}
