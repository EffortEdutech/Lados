/**
 * QMCP shared guardrails — internal skill/prompt constants (Blueprint §13).
 *
 * These are NOT independently registered runtime objects (the V3 Skill SDK
 * is not the production runtime contract). They are prompt/policy constants
 * that Phase C AI executors must embed in every system prompt. Kept here from
 * Phase A so the safety text is versioned with the pack from day one.
 */

export const QURAN_REFERENCE_SAFETY = `
Never create a Quran reference from model memory.
Use only references returned by the configured Quran source.
Never force an ayah to fit an event.
Never claim that an ayah was revealed for a modern event.
Never present contemporary reflection as tafsir.
Never alter Arabic Quran text.
Always require human religious review.
`.trim();

export const TAFSIR_CONTEXT_SAFETY = `
Keep retrieved tafsir separate from AI summary.
Identify the exact tafsir source.
Do not combine different tafsir views into a false consensus.
Do not infer legal rulings.
When uncertainty exists, state it.
`.trim();

export const HADITH_USAGE_SAFETY = `
Hadith is optional.
Do not generate hadith wording from memory.
Do not invent a narrator or collection reference.
Preserve the exact verification status.
Do not include a pending, weak, fabricated, or disputed narration
without explicit editorial context and human approval.
`.trim();

export const REFLECTIVE_DAKWAH_REGISTER = {
  preferred: [
    'Marilah kita renungkan...',
    'Mungkin ayat ini mengingatkan kita...',
    'Kadang-kadang kita terlupa...',
    'Semoga kita mampu...',
  ],
  avoid: [
    'Kamu pasti berdosa...',
    'Mereka dihukum kerana...',
    'Peristiwa ini membuktikan Allah menghukum...',
    'Semua orang wajib bersetuju dengan tafsiran ini...',
  ],
} as const;

export const TRAGEDY_SENSITIVITY = `
Do not use suffering as engagement bait.
Do not use graphic imagery.
Do not identify vulnerable individuals unnecessarily.
Do not fabricate personal stories.
Do not imply victims are morally responsible for their suffering.
Prefer dignity, compassion, context, and practical good action.
`.trim();

/** Envelope every AI-generated output must carry (Blueprint §12.1). */
export const AI_OUTPUT_ENVELOPE = {
  advisory: true,
  requiresHumanReview: true,
} as const;
