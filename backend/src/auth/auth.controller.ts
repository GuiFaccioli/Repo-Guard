import {
  Controller,
  Get,
  Logger,
  Post,
  Query,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import type { Request, Response } from 'express';
import { AuthService } from './auth.service';

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(private readonly authService: AuthService) {}

  @Get('github/start')
  startGithubOAuth(@Req() req: Request, @Res() res: Response) {
    const authorizationUrl = this.authService.buildGithubAuthorizationUrl(
      req.session,
    );
    return res.redirect(authorizationUrl);
  }

  @Get('github/callback')
  async handleGithubCallback(
    @Req() req: Request,
    @Res() res: Response,
    @Query('code') code?: string,
    @Query('state') state?: string,
  ) {
    try {
      await this.authService.handleGithubCallback(req.session, code, state);
      const frontendUrl = this.authService.getFrontendUrl();
      return res.redirect(`${frontendUrl}/repositories`);
    } catch (error) {
      this.logger.warn(
        `GitHub OAuth callback failed: ${this.getOAuthFailureLabel(error)}`,
      );
      const frontendUrl = this.authService.getFrontendUrl();
      return res.redirect(`${frontendUrl}/auth/callback?error=oauth_failed`);
    }
  }

  @Get('me')
  getCurrentUser(@Req() req: Request) {
    const user = this.authService.getAuthenticatedUser(req.session);

    if (!user) {
      return {
        authenticated: false,
        user: null,
      };
    }

    return {
      authenticated: true,
      user: {
        githubId: user.githubId,
        login: user.login,
        name: user.name,
        avatarUrl: user.avatarUrl,
        htmlUrl: user.htmlUrl,
      },
    };
  }

  @Post('logout')
  async logout(@Req() req: Request, @Res() res: Response) {
    if (!req.session) {
      throw new UnauthorizedException('No active session.');
    }

    await this.authService.logout(req.session);
    res.clearCookie('repoguard.sid');

    return res.json({
      success: true,
    });
  }

  private getOAuthFailureLabel(error: unknown): string {
    if (!(error instanceof Error)) {
      return 'unknown';
    }

    const message = error.message.toLowerCase();

    if (message.includes('missing oauth callback parameters')) {
      return 'missing_state';
    }

    if (message.includes('invalid oauth state')) {
      return 'state_mismatch';
    }

    if (message.includes('environment variables are not configured')) {
      return 'oauth_env_missing';
    }

    if (message.includes('could not exchange oauth code')) {
      return 'token_exchange_failed';
    }

    if (message.includes('did not return an access token')) {
      return 'token_missing';
    }

    if (message.includes('could not fetch github profile')) {
      return 'profile_fetch_failed';
    }

    return 'unknown';
  }
}
