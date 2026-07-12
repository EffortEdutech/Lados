import { Module } from '@nestjs/common';
import { ExecutionController } from './execution.controller';
import { ExecutionService } from './execution.service';
import { RunWatchdogService } from './run-watchdog.service'; // Phase 21 S3 (D3)
import { ExecutionWorker }  from '../queue/execution-worker';
import { FileModule } from '../file/file.module';
import { LibraryModule } from '../library/library.module';
import { ResourceModule } from '../resource/resource.module';
import { StateEngineModule } from '../state-engine/state-engine.module';
import { ApprovalCoreModule } from '../approval/approval-core.module';
import { ArtifactModule } from '../artifact/artifact.module';
import { PackModule } from '../pack/pack.module';
import { ResourceBindingsModule } from '../resource-bindings/resource-bindings.module';
import { DataPacksModule } from '../data-packs/data-packs.module';
import { ProgramArtifactModule } from '../program-artifact/program-artifact.module'; // Phase 23 S23.3, renamed Phase 24 S24.2

// AiModule, NotificationModule, DocumentModule, EventBusModule are @Global() — available via global scope.
// Phase 7:  ApprovalCoreModule provides ApprovalTaskCreator (no circular dep with ExecutionModule).
// Phase 9C: ArtifactModule provides ArtifactService for artifact.write / artifact.read nodes.
// Phase 12: QueueModule is @Global() — ExecutionQueueService injected from global scope.
//            ExecutionWorker lives here (not QueueModule) so it can access all feature services.
// Phase 14: PackModule provides PackRegistryService for org node override → skipNodes resolution.

@Module({
  imports: [
    FileModule,
    LibraryModule,
    ResourceModule,
    StateEngineModule,
    ApprovalCoreModule,
    ArtifactModule,
    PackModule,
    ResourceBindingsModule,
    DataPacksModule,
    ProgramArtifactModule,
  ],
  controllers: [ExecutionController],
  providers: [ExecutionService, ExecutionWorker, RunWatchdogService],
  exports: [ExecutionService],
})
export class ExecutionModule {}
