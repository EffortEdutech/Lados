import { Module } from '@nestjs/common';
import { ProgramExecutionController } from './program-execution.controller';
import { ProgramExecutionService } from './program-execution.service';
import { ProgramWatchdogService } from './program-watchdog.service';
import { ExecutionModule } from '../execution/execution.module';
import { ApprovalCoreModule } from '../approval/approval-core.module';

/**
 * ProgramExecutionModule — Phase 23 S23.2, renamed from
 * PipelineExecutionModule in Phase 24 S24.1/S24.2.
 *
 * Imports ExecutionModule for ExecutionService (starting a Workflow Stage
 * calls the existing triggerRun() unchanged, per §4.1) and ApprovalCoreModule
 * for ApprovalTaskCreator (starting a Stage Gate). Deliberately does NOT
 * import ProgramsModule (S23.1's CRUD module) — reads the `programs` table
 * directly via SupabaseService, same pattern every other service in this
 * codebase uses for a simple cross-table read, avoiding an unnecessary
 * module coupling.
 */
@Module({
  imports: [ExecutionModule, ApprovalCoreModule],
  controllers: [ProgramExecutionController],
  providers: [ProgramExecutionService, ProgramWatchdogService],
  exports: [ProgramExecutionService],
})
export class ProgramExecutionModule {}
