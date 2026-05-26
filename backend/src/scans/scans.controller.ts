import { Body, Controller, Post } from '@nestjs/common';
import { ScansService } from './scans.service';

interface RunScanBody {
  repositoryUrl?: unknown;
  checklists?: unknown;
}

@Controller('scans')
export class ScansController {
  constructor(private readonly scansService: ScansService) {}

  @Post()
  async runScan(@Body() body: RunScanBody) {
    return this.scansService.runScan(body?.repositoryUrl, body?.checklists);
  }
}

