import type { ExecutionMode } from '@lados/execution-engine';

const EXECUTION_MODES: ReadonlySet<string> = new Set([
  'development-simulation',
  'test',
  'production-strict',
]);

/** Resolve the runtime policy without reading configuration files. */
export function resolveExecutionMode(environment: NodeJS.ProcessEnv = process.env): ExecutionMode {
  const configured = environment['LADOS_EXECUTION_MODE'];
  if (configured && EXECUTION_MODES.has(configured)) {
    return configured as ExecutionMode;
  }

  if (environment['NODE_ENV'] === 'test') return 'test';
  if (environment['NODE_ENV'] === 'development') return 'development-simulation';
  return 'production-strict';
}
