import { Module } from '@nestjs/common';
import { WorkflowController } from './workflow.controller';
import { OrgWorkflowsController } from './org-workflows.controller'; // Phase 23 S23.4
import { WorkflowService } from './workflow.service';
import { ExecutionModule } from '../execution/execution.module';

@Module({
  imports: [ExecutionModule],
  controllers: [WorkflowController, OrgWorkflowsController],
  providers: [WorkflowService],
  exports: [WorkflowService],
})
export class WorkflowModule {}
