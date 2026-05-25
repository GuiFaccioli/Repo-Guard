import { Controller, Get, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RepositoriesService } from './repositories.service';

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  async listRepositories(@Req() req: Request) {
    return this.repositoriesService.listAuthenticatedPublicRepositories(
      req.session,
    );
  }
}
