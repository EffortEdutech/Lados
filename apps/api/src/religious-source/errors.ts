/**
 * Error taxonomy matching the QMCP Blueprint §16 / Volume 2 §5 catalogued
 * error codes. The pack's node executors catch these and copy `.code`
 * straight into their NodeExecuteResult['error'].code — this module never
 * invents a new code the pack doesn't already know about.
 */
export class ReligiousSourceError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'ReligiousSourceError';
  }
}

export const RS_ERROR = {
  RELIGIOUS_DATA_PATH_NOT_CONFIGURED: 'RELIGIOUS_DATA_PATH_NOT_CONFIGURED',
  QUL_DATASET_NOT_FOUND: 'QUL_DATASET_NOT_FOUND',
  QUL_DATASET_INTEGRITY_FAILED: 'QUL_DATASET_INTEGRITY_FAILED',
  INVALID_QURAN_REFERENCE: 'INVALID_QURAN_REFERENCE',
  TRANSLATION_NOT_CONFIGURED: 'TRANSLATION_NOT_CONFIGURED',
  TAFSIR_NOT_CONFIGURED: 'TAFSIR_NOT_CONFIGURED',
} as const;
