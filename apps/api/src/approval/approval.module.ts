import { Module } from '@nestjs/common';
import { ApprovalService } from './approval.service';
import { ApprovalController } from './approval.controller';
import { ApprovalCoreModule } from './approval-core.module';
import { ApprovalWatchdogService } from './approval-watchdog.service'; // Phase 22 S22.2 (§4.3)
import { SupabaseModule } from '../common/supabase/supabase.module';
import { ExecutionModule } from '../execution/execution.module';
import { StateEngineModule } from '../state-engine/state-engine.module';

@Module({
  imports: [SupabaseModule, ApprovalCoreModule, ExecutionModule, StateEngineModule],
  providers: [ApprovalService, ApprovalWatchdogService],
  controllers: [ApprovalController],
  exports: [ApprovalService],
})
export class ApprovalModule {}
