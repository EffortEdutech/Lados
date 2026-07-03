/**
 * SchedulerModule — Phase 10
 *
 * Provides SchedulerService which polls for cron-triggered workflow subscriptions
 * and fires them via ExecutionService.enqueueOrRunInline() (Phase 21 S3 / D2).
 *
 * Dependencies:
 *   - SupabaseService  (@Global via SupabaseModule)
 *   - ExecutionService (exported by ExecutionModule — not global, must be imported here)
 */
import { Module } from '@nestjs/common';
import { SchedulerService } from './scheduler.service';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports:   [ExecutionModule],
  providers: [SchedulerService],
  exports:   [SchedulerService],
})
export class SchedulerModule {}
