/**
 * Deterministic publication-safety checks (Blueprint §12.3, §19; Volume 2
 * §4.3.6 step 3 + §7 unit test matrix "critical" test). These checks run
 * whether or not the AI advisory pass in validate_dakwah_content succeeds —
 * validation must never silently degrade to a no-op just because the AI
 * call failed or is unconfigured. This is the single most important safety
 * property in the whole pack; keep this file dependency-free (no AI calls).
 */
import type { ShortVideoScript, EvidenceBundle } from '../types';
import { REFLECTIVE_DAKWAH_REGISTER } from '../prompts/shared-guardrails';
import { checkHadithUsage } from './hadith-citation.validator';

export interface DeterministicCheckResult {
  issues: string[];
  riskLevel: 'low' | 'medium' | 'high';
  requiredHumanActions: string[];
}

export function runDeterministicChecks(script: ShortVideoScript, bundle?: EvidenceBundle): DeterministicCheckResult {
  const issues: string[] = [];
  const requiredHumanActions: string[] = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  // a) every scene must carry at least one evidence ref
  const scenesWithoutEvidence = script.scenes.filter((s) => !Array.isArray(s.evidenceRefs) || s.evidenceRefs.length === 0);
  if (scenesWithoutEvidence.length > 0) {
    issues.push(
      `${scenesWithoutEvidence.length} scene(s) have no evidenceRefs: scene ${scenesWithoutEvidence
        .map((s) => s.sceneNumber)
        .join(', ')}.`,
    );
    requiredHumanActions.push('Add evidence references to every scene before this script can be approved.');
    riskLevel = 'high';
  }

  // b) unapproved hadith referenced in the script
  if (bundle && bundle.hadithEvidence.length > 0) {
    const hadithCheck = checkHadithUsage(bundle.hadithEvidence);
    if (!hadithCheck.allowed) {
      const scriptText = JSON.stringify(script).toLowerCase();
      const mentionsHadith = bundle.hadithEvidence.some(
        (h) => h.recordId && scriptText.includes(h.recordId.toLowerCase()),
      );
      if (mentionsHadith || script.sourceAppendix.some((s) => s.toLowerCase().includes('semak hadis'))) {
        issues.push(hadithCheck.reason ?? 'Unapproved hadith evidence referenced in script.');
        requiredHumanActions.push('Resolve pending hadith review before this script can be approved.');
        riskLevel = 'high';
      }
    }
  }

  // c) prohibited/avoid phrasing (Blueprint §13.4)
  const scriptText = [script.hook, script.caption, script.callToAction, ...script.scenes.map((s) => s.voiceover + ' ' + s.onScreenText)]
    .join(' ')
    .toLowerCase();
  const matchedAvoidPhrases = REFLECTIVE_DAKWAH_REGISTER.avoid.filter((phrase) =>
    scriptText.includes(phrase.toLowerCase().replace(/\.\.\.$/, '')),
  );
  if (matchedAvoidPhrases.length > 0) {
    issues.push(`Script contains prohibited framing: ${matchedAvoidPhrases.join(' | ')}.`);
    requiredHumanActions.push('Rewrite the flagged phrasing — punitive/blame framing is never permitted (Blueprint §13.4).');
    if (riskLevel !== 'high') riskLevel = 'high';
  }

  return { issues, riskLevel, requiredHumanActions };
}
