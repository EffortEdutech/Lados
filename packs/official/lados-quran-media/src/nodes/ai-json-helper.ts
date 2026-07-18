/**
 * Shared JSON-completion helper for the 7 Phase C AI-boundary nodes (Volume
 * 2 §6 "Prompt Engineering Notes"). Every AI call uses jsonMode, and every
 * executor parses-or-repairs-once-or-fails with INVALID_AI_RESPONSE — never
 * loops indefinitely, never accepts partial JSON. Centralized here so all 7
 * nodes retry identically instead of re-implementing the policy each time.
 */
import type { ITextGenerationService } from '../types';

export class InvalidAiResponseError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidAiResponseError';
  }
}

export async function runJsonCompletion<T = unknown>(
  aiService: ITextGenerationService,
  systemPrompt: string,
  userPrompt: string,
  options?: { model?: string; temperature?: number; maxTokens?: number },
): Promise<T> {
  const opts = { ...options, jsonMode: true };

  const first = await aiService.runCompletion(systemPrompt, userPrompt, opts);
  const firstParsed = tryParse<T>(first);
  if (firstParsed.ok) return firstParsed.value;

  const repairPrompt = `Your last response was not valid JSON. Return JSON only, matching the requested shape exactly, with no prose before or after.\n\nYour last response was:\n${first}`;
  const second = await aiService.runCompletion(systemPrompt, repairPrompt, opts);
  const secondParsed = tryParse<T>(second);
  if (secondParsed.ok) return secondParsed.value;

  throw new InvalidAiResponseError('AI response was not valid JSON after one repair attempt.');
}

function tryParse<T>(text: string): { ok: true; value: T } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(text) as T };
  } catch {
    return { ok: false };
  }
}
