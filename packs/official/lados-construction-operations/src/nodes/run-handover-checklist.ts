/**
 * lados.construction.run_handover_checklist — Phase 21 S6 (Wave 4)
 *
 * Deterministic, stateless evaluation — NOT an AI/LLM call and no
 * Workspace Resource persisted. Evaluates a caller-supplied checklist
 * (array of { item, complete }) and reports completion status plus any
 * outstanding items. `checklistRefs` (config) is a Knowledge Pack
 * reference pass-through only (e.g. a handover SOP pack) — the framework
 * logs any item UUIDs referenced in config automatically.
 *
 * Evaluates checklist completion only; handover sign-off must be recorded
 * as a separate human decision (lados.human.record_decision) — this node
 * never signs off itself.
 *
 * Config/Inputs:
 *   checklist.items       — array of { item, complete } — required
 *   checklistRefs          — optional KP ref pass-through
 *   requireAllComplete     — default true
 *
 * Outputs:
 *   result — { advisory:true, totalItems, completedItems, outstandingItems,
 *              allComplete, requiresSignoff, checklistRefsReferenced }
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

interface ChecklistItem {
  item: string;
  complete?: boolean;
}

export async function runHandoverChecklist(ctx: NodeContext): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const cfg = ctx.config as Record<string, unknown>;

  const checklistInput = (inp['checklist'] as Record<string, unknown> | undefined) ?? {};
  const items = (checklistInput['items'] as ChecklistItem[] | undefined) ?? [];
  const checklistRefs = cfg['checklistRefs'] as unknown[] | undefined;
  const requireAllComplete = (cfg['requireAllComplete'] as boolean | undefined) ?? true;

  if (items.length === 0) {
    return {
      status: 'failure',
      outputs: { result: null },
      error: { code: 'MISSING_INPUT', message: 'lados.construction.run_handover_checklist: checklist.items array is required and must not be empty' },
    };
  }

  const outstandingItems = items.filter((i) => !i.complete).map((i) => i.item);
  const completedItems = items.length - outstandingItems.length;
  const allComplete = outstandingItems.length === 0;
  const requiresSignoff = requireAllComplete ? true : allComplete;

  ctx.logger.info(`lados.construction.run_handover_checklist → ${completedItems}/${items.length} complete`);

  return {
    status: 'success',
    outputs: {
      result: {
        advisory: true,
        totalItems: items.length,
        completedItems,
        outstandingItems,
        allComplete,
        requiresSignoff,
        checklistRefsReferenced: checklistRefs ?? [],
      },
    },
    summary: `Handover checklist: ${completedItems}/${items.length} complete${allComplete ? '' : ` — ${outstandingItems.length} outstanding`}`,
  };
}
