import type { OfficialPackSkeleton } from '@lados/pack-sdk';
import type { NodeContext, NodeExecuteResult } from '@lados/execution-engine';

type NodeExecutor = (ctx: NodeContext) => Promise<NodeExecuteResult>;

export type NodeReadinessState = 'implemented' | 'stub' | 'missing_executor';
export type PackReadinessState = 'runtime_ready' | 'degraded' | 'blocked' | 'catalogue_only';

export interface RuntimeNodeReadiness {
  type: string;
  state: NodeReadinessState;
  declaredExecutorStatus: string;
  resolverAvailable: boolean;
}

export interface RuntimePackReadiness {
  packId: string;
  displayName: string;
  layer: string;
  state: PackReadinessState;
  declaredRuntimeStatus: string;
  nodes: RuntimeNodeReadiness[];
  contradictions: string[];
}

export interface RuntimeReadinessReport {
  checkedAt: string;
  packs: RuntimePackReadiness[];
  summary: Record<PackReadinessState, number>;
  contradictions: string[];
}

export function buildRuntimeReadinessReport(
  skeletons: OfficialPackSkeleton[],
  resolveNode: (nodeType: string) => NodeExecutor | null,
): RuntimeReadinessReport {
  const packs = skeletons.map(({ manifest, nodes }) => {
    const contradictions: string[] = [];
    const nodeReadiness = nodes.map((node) => {
      const resolverAvailable = resolveNode(node.type) !== null;
      if (node.executorStatus === 'implemented' && !resolverAvailable) {
        contradictions.push(`${node.type}: declared implemented but resolver is missing`);
      }
      if (node.executorStatus !== 'implemented' && manifest.runtimeStatus === 'runtime_enabled') {
        contradictions.push(`${node.type}: non-implemented executor inside runtime-enabled pack`);
      }
      const state: NodeReadinessState = !resolverAvailable
        ? 'missing_executor'
        : node.executorStatus === 'implemented' ? 'implemented' : 'stub';
      return {
        type: node.type,
        state,
        declaredExecutorStatus: node.executorStatus,
        resolverAvailable,
      };
    });

    let state: PackReadinessState;
    if (nodeReadiness.length === 0) state = 'catalogue_only';
    else if (nodeReadiness.some((node) => node.state === 'missing_executor')) state = 'blocked';
    else if (nodeReadiness.some((node) => node.state === 'stub') || manifest.runtimeStatus !== 'runtime_enabled') state = 'degraded';
    else state = 'runtime_ready';

    return {
      packId: manifest.id,
      displayName: manifest.displayName,
      layer: manifest.layer,
      state,
      declaredRuntimeStatus: manifest.runtimeStatus,
      nodes: nodeReadiness,
      contradictions,
    };
  });

  const summary: Record<PackReadinessState, number> = {
    runtime_ready: 0,
    degraded: 0,
    blocked: 0,
    catalogue_only: 0,
  };
  for (const pack of packs) summary[pack.state] += 1;

  return {
    checkedAt: new Date().toISOString(),
    packs,
    summary,
    contradictions: packs.flatMap((pack) => pack.contradictions.map((item) => `${pack.packId}: ${item}`)),
  };
}
