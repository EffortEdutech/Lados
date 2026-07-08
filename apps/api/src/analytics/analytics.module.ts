import { Module } from '@nestjs/common';
import { AnalyticsController } from './analytics.controller';
import { AnalyticsService } from './analytics.service';
import { AnalyticsRollupService } from './analytics-rollup.service'; // Phase 22 S22.3

@Module({
  controllers: [AnalyticsController],
  providers:   [AnalyticsService, AnalyticsRollupService],
  exports:     [AnalyticsService],
})
export class AnalyticsModule {}
