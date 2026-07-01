import { BadRequestException, NotFoundException } from '@nestjs/common';
import type {
  NodeInstanceId,
  QSWorkflowDefinition,
  WorkflowConnection,
  WorkflowNodeInstance,
  WorkflowSkillGroup,
} from '@lados/shared-types';

export interface GroupEntryPort {
  nodeId: string;
  nodeLabel: string;
  nodeType: string;
  portId: string;
  portLabel: string;
  sourceNodeId?: string;
}

export interface ExtractedGroupSubgraph {
  group: WorkflowSkillGroup;
  definition: QSWorkflowDefinition;
  entryPorts: GroupEntryPort[];
}

function getGroup(workflow: QSWorkflowDefinition, groupId: string): WorkflowSkillGroup {
  const group = workflow.ui?.groups?.find((candidate) => candidate.id === groupId);
  if (!group) throw new NotFoundException(`Group ${groupId} not found`);
  if (!group.nodeIds.length) throw new BadRequestException('Group has no member nodes');
  return group;
}

function uniquePorts(ports: GroupEntryPort[]): GroupEntryPort[] {
  const seen = new Set<string>();
  return ports.filter((port) => {
    const key = `${port.nodeId}:${port.portId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function detectEntryPorts(
  groupNodes: WorkflowNodeInstance[],
  groupNodeIds: Set<string>,
  connections: WorkflowConnection[],
): GroupEntryPort[] {
  const nodeById = new Map(groupNodes.map((node) => [node.id as string, node]));
  const externalInputs = connections
    .filter((connection) =>
      groupNodeIds.has(connection.targetNodeId as string) &&
      !groupNodeIds.has(connection.sourceNodeId as string),
    )
    .map((connection) => {
      const node = nodeById.get(connection.targetNodeId as string);
      return {
        nodeId: connection.targetNodeId as string,
        nodeLabel: node?.label ?? node?.type ?? connection.targetNodeId,
        nodeType: node?.type ?? 'unknown',
        portId: connection.targetPortId,
        portLabel: connection.targetPortId,
        sourceNodeId: connection.sourceNodeId as string,
      };
    });

  if (externalInputs.length > 0) return uniquePorts(externalInputs);

  const internalTargets = new Set(
    connections
      .filter((connection) =>
        groupNodeIds.has(connection.sourceNodeId as string) &&
        groupNodeIds.has(connection.targetNodeId as string),
      )
      .map((connection) => connection.targetNodeId as string),
  );

  return groupNodes
    .filter((node) => !internalTargets.has(node.id as string))
    .map((node) => ({
      nodeId: node.id as string,
      nodeLabel: node.label ?? node.type,
      nodeType: node.type,
      portId: 'in',
      portLabel: 'in',
    }));
}

export function extractGroupSubgraph(
  workflow: QSWorkflowDefinition,
  groupId: string,
): ExtractedGroupSubgraph {
  const group = getGroup(workflow, groupId);
  const groupNodeIds = new Set<string>(group.nodeIds.map(String));
  const nodes = (workflow.nodes ?? []).filter((node) => groupNodeIds.has(node.id as string));

  if (nodes.length === 0) {
    throw new BadRequestException(`Group "${group.name}" has no valid workflow nodes`);
  }

  const connections = (workflow.connections ?? []).filter((connection) =>
    groupNodeIds.has(connection.sourceNodeId as string) &&
    groupNodeIds.has(connection.targetNodeId as string),
  );

  const entryPorts = detectEntryPorts(nodes, groupNodeIds, workflow.connections ?? []);
  const nodeIdMap = new Map(nodes.map((node) => [node.id as string, node.id]));
  const remappedGroup: WorkflowSkillGroup = {
    ...group,
    nodeIds: nodes.map((node) => node.id as NodeInstanceId),
  };

  return {
    group,
    entryPorts,
    definition: {
      ...workflow,
      nodes,
      connections,
      ui: {
        ...workflow.ui,
        groups: [
          {
            ...remappedGroup,
            nodeIds: remappedGroup.nodeIds.filter((nodeId) => nodeIdMap.has(nodeId as string)),
          },
        ],
      },
    },
  };
}
