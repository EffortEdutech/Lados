/**
 * AiModule — Phase 10 (AI Runtime)
 *
 * Provides AiService globally (Phase 9 unchanged).
 * Phase 10 adds:
 *   - AiContextBuilderService (context assembly)
 *   - AiController            (POST /ai/assist)
 *
 * SupabaseModule is @Global so no need to import it here.
 *
 * Sprint 9 (S9-002) / Sprint 10 (S10-006)
 */
import { Global, Module, forwardRef } from '@nestjs/common';
import { AiService }                from './ai.service';
import { AiContextBuilderService }  from './ai-context-builder.service';
import { AiController }             from './ai.controller';
import { WorkflowTriggerService }   from './workflow-trigger.service';
import { WorkflowSuggestService }   from './workflow-suggest.service';
import { WorkflowEditService }      from './workflow-edit.service';
import { ResourceModule }           from '../resource/resource.module';
import { ExecutionModule }          from '../execution/execution.module';

@Global()
@Module({
  imports:     [ResourceModule, forwardRef(() => ExecutionModule)],
  controllers: [AiController],
  providers:   [AiService, AiContextBuilderService, WorkflowTriggerService, WorkflowSuggestService, WorkflowEditService],
  exports:     [AiService, AiContextBuilderService, WorkflowTriggerService, WorkflowSuggestService, WorkflowEditService],
})
export class AiModule {}
