/**
 * @lados/official-workflow-foundation
 *
 * Phase 21 S2 (Wave 1) — real executors for the `lados.workflow-foundation`
 * official Capability Pack (L0). Registry metadata (ports, config schema,
 * layer, capability keys) lives in ../manifest.json + ../nodes.json and is
 * read by OfficialPackLoaderService; this package only supplies runtime
 * behavior for the execution engine.
 *
 * These nodes are self-contained control-flow primitives — no NestJS
 * services are required, unlike Human Work or Document Intelligence.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

import { triggerManual } from './nodes/trigger-manual';
import { triggerSchedule } from './nodes/trigger-schedule';
import { condition } from './nodes/condition';
import { parallel } from './nodes/parallel';
import { merge } from './nodes/merge';
import { delay } from './nodes/delay';
import { writeLog } from './nodes/write-log';

export { triggerManual, triggerSchedule, condition, parallel, merge, delay, writeLog };

export const PACK_ID = 'lados.workflow-foundation' as const;

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

/**
 * Returns the real executor for a lados.workflow-foundation node type, or
 * null if unknown. No injected services are needed for this pack.
 */
export function resolveNode(): (nodeType: string) => NodeExecutor | null {
  const nodes: Record<string, NodeExecutor> = {
    'lados.workflow.trigger_manual': triggerManual,
    'lados.workflow.trigger_schedule': triggerSchedule,
    'lados.workflow.condition': condition,
    'lados.workflow.parallel': parallel,
    'lados.workflow.merge': merge,
    'lados.workflow.delay': delay,
    'lados.workflow.write_log': writeLog,
  };

  return (nodeType: string) => nodes[nodeType] ?? null;
}
