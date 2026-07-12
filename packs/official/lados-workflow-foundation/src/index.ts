/**
 * @lados/official-workflow-foundation
 *
 * Phase 21 S2 (Wave 1) — real executors for the `lados.workflow-foundation`
 * official Capability Pack (L0). Registry metadata (ports, config schema,
 * layer, capability keys) lives in ../manifest.json + ../nodes.json and is
 * read by OfficialPackLoaderService; this package only supplies runtime
 * behavior for the execution engine.
 *
 * Phase 21 S9.1 (gap closure, 2026-07-04): added `loop` (successor to the
 * prototype `core.loop`) and `publishEvent` (successor to the prototype
 * `event.publish`, closing the "declared but unbuilt" gap on the
 * `workflow.event.publish` capability). `publishEvent` is the only node in
 * this pack that needs an injected NestJS service (EventBusService) — every
 * other node remains a self-contained control-flow primitive.
 *
 * Phase 22 S22.4 (Branching Expressiveness, 2026-07-06): `condition`'s
 * expression grammar extended (named fields + AND/OR, see
 * ./lib/expression.ts) — no signature change, still self-contained. New
 * `switchNode` added for true multi-way routing (up to 5 cases + default).
 *
 * Phase 23 S23.3 (Data Handoff Nodes, 2026-07-08): added
 * `pipelineSaveArtifact`/`pipelineReadArtifact` — cross-workflow data
 * handoff within one pipeline run (successor in spirit to the dead
 * `project.save_artifact`/`project.read_artifact`, architecturally new).
 * The second node needing an injected service (PipelineArtifactService),
 * alongside `publishEvent`'s EventBusService.
 *
 * Phase 24 S24.3 (Node Type Rename, 2026-07-11): `pipelineSaveArtifact`/
 * `pipelineReadArtifact` renamed to `programSaveArtifact`/
 * `programReadArtifact` (files renamed program-save-artifact.ts/
 * program-read-artifact.ts), node types `lados.workflow.pipeline_save_artifact`/
 * `pipeline_read_artifact` renamed to `program_save_artifact`/
 * `program_read_artifact`, `IPipelineArtifactService` renamed to
 * `IProgramArtifactService`, `WorkflowFoundationServices.pipelineArtifactService`
 * renamed to `programArtifactService`. Old node type strings preserved as
 * compatibility aliases (see `@lados/pack-sdk`'s `compatibility-aliases.ts`)
 * so nothing already built against the old type strings silently breaks.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { triggerManual } from './nodes/trigger-manual';
import { triggerSchedule } from './nodes/trigger-schedule';
import { condition } from './nodes/condition';
import { parallel } from './nodes/parallel';
import { merge } from './nodes/merge';
import { delay } from './nodes/delay';
import { writeLog } from './nodes/write-log';
import { loop } from './nodes/loop';
import { publishEvent, type IEventBusService } from './nodes/publish-event';
import { switchNode } from './nodes/switch';
import { programSaveArtifact, type IProgramArtifactService } from './nodes/program-save-artifact';
import { programReadArtifact } from './nodes/program-read-artifact';

export {
  triggerManual, triggerSchedule, condition, parallel, merge, delay, writeLog,
  loop, publishEvent, switchNode, programSaveArtifact, programReadArtifact,
};
export { type IEventBusService, type IProgramArtifactService };

export const PACK_ID = 'lados.workflow-foundation' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface WorkflowFoundationServices {
  eventBusService?: IEventBusService;
  programArtifactService?: IProgramArtifactService;
}

const NO_SERVICE = (code: string, message: string): NodeExecuteResult => ({
  status: 'failure',
  outputs: {},
  error: { code, message },
});

/**
 * Returns the real executor for a lados.workflow-foundation node type, or
 * null if unknown. Only `lados.workflow.publish_event` needs an injected
 * service (EventBusService); every other node is a self-contained
 * control-flow primitive.
 */
export function resolveNode(
  services: WorkflowFoundationServices = {},
): (nodeType: string) => NodeExecutor | null {
  const { eventBusService, programArtifactService } = services;

  const nodes: Record<string, NodeExecutor> = {
    'lados.workflow.trigger_manual': triggerManual,
    'lados.workflow.trigger_schedule': triggerSchedule,
    'lados.workflow.condition': condition,
    'lados.workflow.parallel': parallel,
    'lados.workflow.merge': merge,
    'lados.workflow.delay': delay,
    'lados.workflow.write_log': writeLog,
    'lados.workflow.loop': loop,
    'lados.workflow.switch': switchNode,
    'lados.workflow.publish_event': (ctx) =>
      eventBusService
        ? publishEvent(ctx, eventBusService)
        : Promise.resolve(NO_SERVICE('NO_SERVICE', 'Event bus service not injected')),
    'lados.workflow.program_save_artifact': (ctx) => programSaveArtifact(ctx, programArtifactService),
    'lados.workflow.program_read_artifact': (ctx) => programReadArtifact(ctx, programArtifactService),
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
