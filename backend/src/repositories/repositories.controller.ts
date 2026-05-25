import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import { RepositoriesService } from './repositories.service';

interface RunScanBody {
  scanType?: string;
}

@Controller('repositories')
export class RepositoriesController {
  constructor(private readonly repositoriesService: RepositoriesService) {}

  @Get()
  async listRepositories(@Req() req: Request) {
    return this.repositoriesService.listAuthenticatedPublicRepositories(
      req.session,
    );
  }

  @Post(':id/scans')
  async runRepositoryScan(
    @Req() req: Request,
    @Param('id') id: string,
    @Body() body: RunScanBody,
  ) {
    return this.repositoriesService.scanRepositoryById(
      req.session,
      id,
      body?.scanType,
    );
  }
}
