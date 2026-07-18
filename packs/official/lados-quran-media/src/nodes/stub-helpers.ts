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
