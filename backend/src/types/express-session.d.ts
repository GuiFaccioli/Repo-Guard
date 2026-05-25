import 'express-session';
import type { SessionGithubUser } from '../auth/auth.types';

declare module 'express-session' {
  interface SessionData {
    oauthState?: string;
    oauthStateExpiresAt?: number;
    githubAccessToken?: string;
    githubUser?: SessionGithubUser;
  }
}
