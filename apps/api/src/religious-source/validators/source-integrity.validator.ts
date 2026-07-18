/**
 * Dataset file integrity validator (Blueprint §7.4 "Calculate checksum" /
 * "Inspect schema"). Used by the QUL adapters when a manifest entry declares
 * a contentHash — verifies the on-disk file has not been altered/corrupted
 * since it was registered. Checksum is optional per entry (Volume 1 leaves
 * dataset selection TO_BE_SELECTED, so early fixture entries may omit it).
 */
import { createHash } from 'node:crypto';

export interface IntegrityCheckResult {
  valid: boolean;
  issue?: string;
}

export function sha256Hex(content: string): string {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

/**
 * Verifies raw file content against an optional declared checksum.
 * If no checksum is declared, integrity is trivially valid (nothing to
 * compare against) — this matches Blueprint §7.3 where individual manifest
 * entries may still be `pending_approval` and not yet checksummed.
 */
export function verifyDatasetIntegrity(content: string, declaredContentHash?: string): IntegrityCheckResult {
  if (!declaredContentHash) {
    return { valid: true };
  }
  const actual = sha256Hex(content);
  if (actual !== declaredContentHash) {
    return {
      valid: false,
      issue: `checksum mismatch: manifest declares ${declaredContentHash}, file hashes to ${actual}`,
    };
  }
  return { valid: true };
}

/** Minimal JSON-shape check for ayah-keyed text datasets ("surah:ayah" -> string). */
export function verifyAyahTextDatasetShape(parsed: unknown): IntegrityCheckResult {
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    return { valid: false, issue: 'expected a flat object keyed by "surah:ayah"' };
  }
  const entries = Object.entries(parsed as Record<string, unknown>);
  for (const [key, value] of entries) {
    if (!/^\d{1,3}:\d{1,3}$/.test(key)) {
      return { valid: false, issue: `malformed key "${key}", expected "surah:ayah"` };
    }
    if (typeof value !== 'string' || value.trim().length === 0) {
      return { valid: false, issue: `empty or non-string value at key "${key}"` };
    }
  }
  return { valid: true };
}
