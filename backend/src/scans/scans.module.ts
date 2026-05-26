import { Module } from '@nestjs/common';
import { ScansController } from './scans.controller';
import { ScansService } from './scans.service';
import { AiReviewService } from './ai-review.service';

@Module({
  controllers: [ScansController],
  providers: [ScansService, AiReviewService],
})
export class ScansModule {}
