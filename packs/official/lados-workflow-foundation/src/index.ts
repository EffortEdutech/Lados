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

export { triggerManual, triggerSchedule, condition, parallel, merge, delay, writeLog, loop, publishEvent, switchNode };
export { type IEventBusService };

export const PACK_ID = 'lados.workflow-foundation' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export interface WorkflowFoundationServices {
  eventBusService?: IEventBusService;
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
  const { eventBusService } = services;

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
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
