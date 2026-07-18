/**
 * Shared helpers for QMCP Phase A honest-stub executors.
 *
 * Every QMCP node follows the lados.video.render_scenes honest-stub pattern:
 * validate inputs deterministically, then fail with a catalogued error code
 * (Blueprint §16) when the backing service is not wired — never fabricate a
 * successful result. Phase B–D replace the NOT_IMPLEMENTED paths with real
 * logic without changing any node contract.
 */
import type { NodeExecuteResult } from '@lados/execution-engine';

export function fail(code: string, message: string): NodeExecuteResult {
  return { status: 'failure', outputs: {}, error: { code, message } };
}

export function missingInput(nodeType: string, portId: string, hint: string): NodeExecuteResult {
  return fail('MISSING_INPUT', `${nodeType}: ${portId} is required (${hint})`);
}

export function notImplemented(nodeType: string, phase: string): NodeExecuteResult {
  return fail(
    'NODE_NOT_IMPLEMENTED',
    `${nodeType}: executor is a Phase A skeleton stub — real implementation lands in ${phase} of the QMCP delivery plan. This node will never fabricate a result.`,
  );
}

/**
 * Maps an error thrown by an injected service (religious-source, AI, etc.)
 * to a NodeExecuteResult failure. Uses structural duck-typing on `.code`
 * rather than an `instanceof` check — this pack must never import an
 * apps/api-specific error class (that would invert the pack/app dependency
 * direction). If the thrown value has no string `.code`, falls back to the
 * caller-supplied default code.
 */
export function failFromError(defaultCode: string, e: unknown): NodeExecuteResult {
  const code =
    e && typeof e === 'object' && 'code' in e && typeof (e as Record<string, unknown>)['code'] === 'string'
      ? ((e as Record<string, unknown>)['code'] as string)
      : defaultCode;
  const message = e instanceof Error ? e.message : String(e);
  return fail(code, message);
}
