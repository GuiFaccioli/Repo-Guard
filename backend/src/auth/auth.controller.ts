import {
  Controller,
  Get,
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
    } catch {
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
      user,
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
}
