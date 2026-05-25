import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Session, SessionData } from 'express-session';
import { randomBytes } from 'node:crypto';
import type {
  GithubOAuthTokenResponse,
  GithubUserEmail,
  GithubUserProfile,
  SessionGithubUser,
} from './auth.types';

type AppSession = Session & Partial<SessionData>;

@Injectable()
export class AuthService {
  constructor(private readonly configService: ConfigService) {}

  getFrontendUrl() {
    return (
      this.configService.get<string>('FRONTEND_URL') ?? 'http://localhost:5173'
    );
  }

  buildGithubAuthorizationUrl(session: AppSession) {
    const state = randomBytes(24).toString('hex');
    session.oauthState = state;
    session.oauthStateExpiresAt = Date.now() + 1000 * 60 * 10;

    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL');

    if (!clientId || !callbackUrl) {
      throw new BadRequestException(
        'GitHub OAuth environment variables are not configured.',
      );
    }

    const params = new URLSearchParams({
      client_id: clientId,
      redirect_uri: callbackUrl,
      scope: 'read:user user:email public_repo',
      state,
      allow_signup: 'false',
    });

    return `https://github.com/login/oauth/authorize?${params.toString()}`;
  }

  async handleGithubCallback(
    session: AppSession,
    code: string | undefined,
    state: string | undefined,
  ) {
    if (!code || !state) {
      throw new BadRequestException('Missing OAuth callback parameters.');
    }

    const isStateValid =
      session.oauthState &&
      session.oauthStateExpiresAt &&
      state === session.oauthState &&
      Date.now() <= session.oauthStateExpiresAt;

    if (!isStateValid) {
      throw new UnauthorizedException('Invalid OAuth state.');
    }

    const clientId = this.configService.get<string>('GITHUB_CLIENT_ID');
    const clientSecret = this.configService.get<string>('GITHUB_CLIENT_SECRET');
    const callbackUrl = this.configService.get<string>('GITHUB_CALLBACK_URL');

    if (!clientId || !clientSecret || !callbackUrl) {
      throw new BadRequestException(
        'GitHub OAuth environment variables are not configured.',
      );
    }

    const tokenResponse = await fetch(
      'https://github.com/login/oauth/access_token',
      {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: new URLSearchParams({
          client_id: clientId,
          client_secret: clientSecret,
          code,
          redirect_uri: callbackUrl,
          state,
        }),
      },
    );

    if (!tokenResponse.ok) {
      throw new UnauthorizedException('Could not exchange OAuth code.');
    }

    const tokenData =
      (await tokenResponse.json()) as GithubOAuthTokenResponse | null;
    const accessToken = tokenData?.access_token;

    if (!accessToken) {
      throw new UnauthorizedException('GitHub did not return an access token.');
    }

    const profileResponse = await fetch('https://api.github.com/user', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoGuard',
      },
    });

    if (!profileResponse.ok) {
      throw new UnauthorizedException('Could not fetch GitHub profile.');
    }

    const profileData = (await profileResponse.json()) as GithubUserProfile;
    const email = await this.fetchPrimaryEmail(accessToken);

    const githubUser: SessionGithubUser = {
      id: profileData.id,
      login: profileData.login,
      name: profileData.name,
      avatarUrl: profileData.avatar_url,
      email,
    };

    session.githubUser = githubUser;
    session.githubAccessToken = accessToken;
    session.oauthState = undefined;
    session.oauthStateExpiresAt = undefined;
  }

  getAuthenticatedUser(session: AppSession) {
    return session.githubUser ?? null;
  }

  async logout(session: AppSession) {
    await new Promise<void>((resolve, reject) => {
      session.destroy((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  }

  private async fetchPrimaryEmail(accessToken: string) {
    const emailResponse = await fetch('https://api.github.com/user/emails', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        Accept: 'application/vnd.github+json',
        'User-Agent': 'RepoGuard',
      },
    });

    if (!emailResponse.ok) {
      return null;
    }

    const emails = (await emailResponse.json()) as GithubUserEmail[];
    const primaryEmail = emails.find((email) => email.primary && email.verified);
    return primaryEmail?.email ?? null;
  }
}
