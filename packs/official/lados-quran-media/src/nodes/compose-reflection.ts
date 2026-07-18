/**
 * lados.quran_media.compose_reflection — STUB (real logic: Phase C)
 *
 * Creates an evidence-grounded reflective dakwah passage from the
 * human-confirmed evidence bundle, in the reflective register (see
 * prompts/shared-guardrails.ts). Output always carries the advisory /
 * requiresHumanReview envelope. Fails honestly without a configured AI service.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService } from '../types';
import { fail, missingInput, notImplemented } from './stub-helpers';

const NODE = 'lados.quran_media.compose_reflection';

export async function composeReflection(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  if (!inp['bundle'] || typeof inp['bundle'] !== 'object') {
    return missingInput(NODE, 'bundle', 'connect build_evidence_bundle via the Gate 2 religious review');
  }
  if (!aiService || !aiService.isConfigured) {
    return fail('AI_SERVICE_NOT_CONFIGURED', `${NODE}: no text-generation service is wired yet (Phase C).`);
  }
  return notImplemented(NODE, 'Phase C (AI editorial nodes)');
}
