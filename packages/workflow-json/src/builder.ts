import type {
  QSWorkflowDefinition,
  WorkflowNodeInstance,
  WorkflowConnection,
} from '@lados/shared-types';
import type { WorkflowId, NodeInstanceId, NodeTypeId } from '@lados/shared-types';
import { WORKFLOW_SCHEMA_VERSION } from './constants';

/**
 * WorkflowBuilder — fluent helper for constructing a valid QSWorkflowDefinition.
 *
 * Used by tests, seeds, and the API when creating a blank workflow.
 *
 * @example
 *   const def = new WorkflowBuilder('My Workflow', 'wf-123' as WorkflowId)
 *     .addNode({ id: 'n1' as NodeInstanceId, type: 'core.start' as NodeTypeId, position: { x: 0, y: 0 } })
 *     .addNode({ id: 'n2' as NodeInstanceId, type: 'core.end' as NodeTypeId, position: { x: 200, y: 0 } })
 *     .addConnection({ id: 'c1', sourceNodeId: 'n1' as NodeInstanceId, sourcePortId: 'out', targetNodeId: 'n2' as NodeInstanceId, targetPortId: 'in' })
 *     .build();
 */
export class WorkflowBuilder {
  private nodes: WorkflowNodeInstance[] = [];
  private connections: WorkflowConnection[] = [];

  constructor(
    private readonly name: string,
    private readonly id: WorkflowId,
    private readonly version = '1.0.0',
  ) {}

  addNode(node: WorkflowNodeInstance): this {
    this.nodes.push(node);
    return this;
  }

  addConnection(conn: WorkflowConnection): this {
    this.connections.push(conn);
    return this;
  }

  build(): QSWorkflowDefinition {
    const now = new Date().toISOString();
    return {
      schemaVersion: WORKFLOW_SCHEMA_VERSION,
      workflow: {
        id: this.id,
        name: this.name,
        version: this.version,
        status: 'draft',
        createdAt: now,
        updatedAt: now,
      },
      nodes: this.nodes,
      connections: this.connections,
    };
  }

  /**
   * Create a minimal blank workflow definition (Start + End nodes).
   *
   * Phase 21 S9 (2026-07-04): 'core.start'/'core.end' were registered_nodes
   * rows belonging to the legacy prototype core-pack, which has been fully
   * removed from the platform (migration 0065 hard-deletes its packs/
   * registered_nodes rows; the source is preserved, unbuilt, under
   * archived/packs/core-pack). Neither had a compatibility alias to an
   * official successor (unlike core.logger -> lados.workflow.write_log,
   * core.condition -> lados.workflow.condition, etc. — see
   * packages/@lados/pack-sdk/src/compatibility-aliases.ts) since "Start"/
   * "End" were pure canvas scaffolding markers, not real capabilities.
   * Every new blank workflow was hitting GET /nodes/core.start and
   * /nodes/core.end 404s in the property panel as soon as the user clicked
   * either node, because those rows no longer exist.
   *
   * Replaced with the closest real official-pack equivalents from
   * lados-workflow-foundation (the pack whose manifest.json explicitly
   * declares `"prototypeReferences": ["core-pack"]`): trigger_manual is a
   * genuine, direct successor for "Start" ("Start a workflow from a manual
   * operator action"); write_log has no perfect "End" equivalent but is the
   * closest natural terminus marker (logs a checkpoint and stops there) —
   * given a sensible default config so it works immediately without the
   * user having to configure it first.
   */
  static blank(name: string, id: WorkflowId): QSWorkflowDefinition {
    return new WorkflowBuilder(name, id)
      .addNode({
        id: 'node-start' as NodeInstanceId,
        type: 'lados.workflow.trigger_manual' as NodeTypeId,
        label: 'Start',
        position: { x: 100, y: 200 },
        config: { label: 'Start', description: 'Manually start this workflow.' },
      })
      .addNode({
        id: 'node-end' as NodeInstanceId,
        type: 'lados.workflow.write_log' as NodeTypeId,
        label: 'End',
        position: { x: 500, y: 200 },
        config: { message: 'Workflow completed.', level: 'info' },
      })
      .build();
  }
}
