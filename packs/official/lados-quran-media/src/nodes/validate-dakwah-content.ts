/**
 * lados.quran_media.validate_dakwah_content — Phase C (real logic)
 *
 * Detects evidence, religious-safety, editorial, and sensitivity risks in
 * the drafted script and emits the DakwahValidationResult contract. CRITICAL:
 * the deterministic checks (publication-gate.validator.ts) run first and
 * ALWAYS run — this node must never silently become a no-op just because
 * the AI service is unavailable or its response is invalid (Volume 2 §4.3.6
 * step 3, §7 "critical" test). The AI pass only adds softer/contextual
 * findings on top.
 */
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';
import type { ITextGenerationService, ShortVideoScript, EvidenceBundle, DakwahValidationResult } from '../types';
import { fail, missingInput } from './stub-helpers';
import { runJsonCompletion, InvalidAiResponseError } from './ai-json-helper';
import { QURAN_REFERENCE_SAFETY, TAFSIR_CONTEXT_SAFETY, HADITH_USAGE_SAFETY, TRAGEDY_SENSITIVITY } from '../prompts/shared-guardrails';
import { runDeterministicChecks } from '../validators/publication-gate.validator';

const NODE = 'lados.quran_media.validate_dakwah_content';

interface AiValidationPass {
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high';
}

const SYSTEM_PROMPT = `${QURAN_REFERENCE_SAFETY}

${TAFSIR_CONTEXT_SAFETY}

${HADITH_USAGE_SAFETY}

${TRAGEDY_SENSITIVITY}

Review the script for: any phrasing implying blame, punishment-framing, or forced consensus; any claim that an ayah was revealed for this modern event; any graphic/exploitative imagery description; any softer contextual or sensitivity risk a deterministic checker would miss.

Return JSON only, matching exactly: { "issues": string[], "riskLevel": "low"|"medium"|"high" }`;

const RISK_ORDER: Record<'low' | 'medium' | 'high', number> = { low: 0, medium: 1, high: 2 };

export async function validateDakwahContent(
  ctx: NodeContext,
  aiService?: ITextGenerationService,
): Promise<NodeExecuteResult> {
  const inp = ctx.inputs as Record<string, unknown>;
  const script = inp['script'] as ShortVideoScript | undefined;
  if (!script || typeof script !== 'object') {
    return missingInput(NODE, 'script', 'connect write_short_video_script');
  }

  const bundle = inp['bundle'] as EvidenceBundle | undefined;

  // ── Step 1: deterministic checks — ALWAYS run, regardless of AI state. ──
  const deterministic = runDeterministicChecks(script, bundle);

  // ── Step 2: AI advisory pass — best-effort, never blocks or replaces step 1. ──
  let aiIssues: string[] = [];
  let aiRiskLevel: 'low' | 'medium' | 'high' = 'low';
  let aiDegraded = false;

  if (aiService?.isConfigured) {
    try {
      const cfg = ctx.config as Record<string, unknown>;
      const strictMode = cfg['strictMode'] !== false;
      const userPrompt = `script:\n${JSON.stringify(script, null, 2)}\n\nstrictMode: ${strictMode}`;
      const aiResult = await runJsonCompletion<AiValidationPass>(aiService, SYSTEM_PROMPT, userPrompt, {
        temperature: 0.1,
        maxTokens: 800,
      });
      aiIssues = aiResult.issues ?? [];
      aiRiskLevel = aiResult.riskLevel ?? 'low';
    } catch (e: unknown) {
      // AI pass degrading must NOT fail the whole node — the deterministic
      // checks above already ran and are the safety-critical result.
      aiDegraded = true;
      aiIssues = [];
    }
  } else {
    aiDegraded = true;
  }

  const issues = [...deterministic.issues, ...aiIssues];
  const riskLevel: 'low' | 'medium' | 'high' =
    RISK_ORDER[deterministic.riskLevel] >= RISK_ORDER[aiRiskLevel] ? deterministic.riskLevel : aiRiskLevel;
  const requiredHumanActions = [...deterministic.requiredHumanActions];
  if (aiDegraded) {
    requiredHumanActions.push('AI advisory review was unavailable — a human must manually review this script for softer contextual risks before approval.');
  }

  const passed = issues.length === 0;
  const publicationBlocked = riskLevel !== 'low' || !passed;

  const validation: DakwahValidationResult = { passed, riskLevel, issues, requiredHumanActions, publicationBlocked };

  return {
    status: 'success',
    outputs: { validation },
    summary: `Validation ${passed ? 'passed' : 'found issues'} — risk ${riskLevel}${aiDegraded ? ' (AI advisory pass degraded, deterministic checks still enforced)' : ''}`,
  };
}
