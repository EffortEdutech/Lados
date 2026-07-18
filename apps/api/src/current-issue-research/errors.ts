/**
 * Error taxonomy matching the QMCP Blueprint §16 / Volume 2 §5 catalogued
 * error codes for discover_current_issues. Same convention as
 * religious-source/errors.ts — the pack node catches these via
 * `failFromError()` and copies `.code` straight into NodeExecuteResult,
 * never inventing a code the pack doesn't already know about.
 */
export class CurrentIssueResearchError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message);
    this.name = 'CurrentIssueResearchError';
  }
}

export const CIR_ERROR = {
  SOURCE_FETCH_FAILED: 'SOURCE_FETCH_FAILED',
  SOURCE_DATE_INVALID: 'SOURCE_DATE_INVALID',
} as const;
