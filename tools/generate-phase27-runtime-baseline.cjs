#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const officialRoot = path.join(repoRoot, 'packs', 'official');
const apiResolverPath = path.join(repoRoot, 'apps', 'api', 'src', 'execution', 'real-nodes', 'index.ts');
const apiTestRoot = path.join(repoRoot, 'apps', 'api', 'test');
const jsonOutputPath = path.join(repoRoot, 'artifacts', 'runtime-readiness', 'official-pack-readiness.json');
const markdownOutputPath = path.join(
  repoRoot,
  'docs',
  'Lados',
  'V4',
  'Verification',
  'Phase27_Official_Pack_Runtime_Baseline.md',
);

const runtimeDependenciesByPack = {
  'lados.workflow-foundation': {
    services: ['EventBusService', 'ProgramArtifactService'],
    external: [],
  },
  'lados.human-work': {
    services: ['ApprovalTaskCreator', 'NotificationService', 'ResourceService'],
    external: [],
  },
  'lados.document-intelligence': {
    services: ['FileService', 'LibraryService', 'DocumentService', 'IDocumentStorageService (missing)'],
    external: ['PDF/DOCX parser dependency (missing)'],
  },
  'lados.resource-operations': {
    services: ['ResourceService', 'ArtifactService'],
    external: [],
  },
  'lados.task-case': { services: ['ResourceService'], external: [] },
  'lados.communication': {
    services: ['EmailService', 'SmsService', 'NotificationService'],
    external: ['SMTP configuration', 'SMS provider (missing)'],
  },
  'lados.commercial-finance': { services: ['ResourceService'], external: [] },
  'lados.procurement': { services: ['ResourceService'], external: [] },
  'lados.qs-commercial': { services: ['ResourceService'], external: [] },
  'lados.construction-operations': { services: ['ResourceService'], external: [] },
  'lados.contract-admin': { services: ['ResourceService'], external: [] },
  'lados.asset-fleet': {
    services: ['ResourceService', 'AiService'],
    external: ['AI provider for fuel-receipt vision'],
  },
  'lados.people-payroll': { services: ['ResourceService'], external: [] },
  'lados.video-production': {
    services: ['FileService', 'RenderService (missing)'],
    external: ['Remotion render backend (missing)'],
  },
  'lados.quran-media': {
    services: ['AiService', 'ReligiousSourceService', 'CurrentIssueResearchService'],
    external: ['QUL dataset path', 'approved current-issue source allowlist', 'AI provider for editorial nodes'],
  },
};

function readText(filePath) {
  return fs.readFileSync(filePath, 'utf8');
}

function readJson(filePath) {
  return JSON.parse(readText(filePath));
}

function relative(filePath) {
  return path.relative(repoRoot, filePath).replace(/\\/g, '/');
}

function ensureParent(filePath) {
  fs.mkdirSync(path.dirname(filePath), { recursive: true });
}

function listFiles(root, predicate = () => true) {
  if (!fs.existsSync(root)) return [];
  const result = [];
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    const entryPath = path.join(root, entry.name);
    if (entry.isDirectory()) result.push(...listFiles(entryPath, predicate));
    else if (predicate(entryPath)) result.push(entryPath);
  }
  return result;
}

function packageImportName(packDir) {
  const packagePath = path.join(packDir, 'package.json');
  return fs.existsSync(packagePath) ? readJson(packagePath).name : null;
}

function testEvidenceForPack(packName, testFiles) {
  const shortName = packName.replace(/^lados-/, '');
  const direct = testFiles.filter((file) => file.includes(shortName));
  const waveTests = testFiles.filter((file) => file.includes('official-wave'));
  return {
    direct,
    crossPack: waveTests,
    hasDirectContractTest: direct.some((file) => !file.includes('e2e')),
    hasDirectE2eTest: direct.some((file) => file.includes('e2e')),
  };
}

function inferPackReadiness(manifest, nodes, sourceWired) {
  if (nodes.length === 0) return 'catalogue_only';
  if (!sourceWired || nodes.some((node) => !node.resolverDeclared)) return 'blocked';
  if (nodes.some((node) => node.executorStatus === 'stub')) return 'degraded';
  if (manifest.runtimeStatus !== 'runtime_enabled') return 'degraded';
  return 'runtime_ready';
}

function findWorkflowBody(descriptorPath) {
  const workflowPath = descriptorPath.replace(/\.template\.json$/, '.workflow.json');
  return fs.existsSync(workflowPath) ? workflowPath : null;
}

function extractWorkflowNodes(workflow) {
  if (Array.isArray(workflow.nodes)) return workflow.nodes;
  if (Array.isArray(workflow.definition?.nodes)) return workflow.definition.nodes;
  if (Array.isArray(workflow.workflow?.nodes)) return workflow.workflow.nodes;
  return [];
}

function extractWorkflowConnections(workflow) {
  if (Array.isArray(workflow.connections)) return workflow.connections;
  if (Array.isArray(workflow.definition?.connections)) return workflow.definition.connections;
  if (Array.isArray(workflow.workflow?.connections)) return workflow.workflow.connections;
  return [];
}

function validateWorkflowGraph(workflowNodes, connections, nodeByType) {
  const issues = [];
  const nodeById = new Map();
  for (const node of workflowNodes) {
    if (!node.id) {
      issues.push('node without id');
      continue;
    }
    if (nodeById.has(node.id)) issues.push(`duplicate node id: ${node.id}`);
    nodeById.set(node.id, node);
  }

  const outgoing = new Map([...nodeById.keys()].map((id) => [id, []]));
  const indegree = new Map([...nodeById.keys()].map((id) => [id, 0]));

  for (const connection of connections) {
    const source = nodeById.get(connection.sourceNodeId);
    const target = nodeById.get(connection.targetNodeId);
    if (!source) issues.push(`connection ${connection.id ?? '<unknown>'}: missing source node ${connection.sourceNodeId}`);
    if (!target) issues.push(`connection ${connection.id ?? '<unknown>'}: missing target node ${connection.targetNodeId}`);
    if (!source || !target) continue;

    const sourceManifest = nodeByType.get(source.type);
    const targetManifest = nodeByType.get(target.type);
    if (sourceManifest && !sourceManifest.outputPortIds.includes(connection.sourcePortId)) {
      issues.push(`connection ${connection.id ?? '<unknown>'}: unknown source port ${source.type}.${connection.sourcePortId}`);
    }
    if (targetManifest && !targetManifest.inputPortIds.includes(connection.targetPortId)) {
      issues.push(`connection ${connection.id ?? '<unknown>'}: unknown target port ${target.type}.${connection.targetPortId}`);
    }

    outgoing.get(source.id).push(target.id);
    indegree.set(target.id, indegree.get(target.id) + 1);
  }

  const queue = [...indegree.entries()].filter(([, degree]) => degree === 0).map(([id]) => id);
  let visited = 0;
  while (queue.length) {
    const id = queue.shift();
    visited += 1;
    for (const targetId of outgoing.get(id) ?? []) {
      const nextDegree = indegree.get(targetId) - 1;
      indegree.set(targetId, nextDegree);
      if (nextDegree === 0) queue.push(targetId);
    }
  }
  if (visited !== nodeById.size) issues.push('workflow graph contains a cycle');

  return issues;
}

function markdownCell(value) {
  return String(value ?? '').replace(/\|/g, '\\|').replace(/\r?\n/g, ' ');
}

function renderMarkdown(report) {
  const lines = [];
  const push = (...values) => lines.push(...values);

  push(
    '# Phase 27 Official Pack Runtime Baseline',
    '',
    `**Generated:** ${report.generatedAt}`,
    '',
    '**Scope:** Static repository evidence for S27.0. Archived packs are excluded. Provider sandbox health, live credentials, Supabase state, and browser execution are not claimed by this report.',
    '',
    '## Executive findings',
    '',
    `- Official workspaces: **${report.summary.packCount}** (${report.summary.executablePackCount} with nodes; ${report.summary.compositionPackCount} composition-only).`,
    `- Official nodes: **${report.summary.nodeCount}** (${report.summary.implementedNodeCount} declared implemented; ${report.summary.stubNodeCount} declared stub).`,
    `- Resolver declarations: **${report.summary.resolverDeclaredNodeCount}/${report.summary.nodeCount}** node types are present in a pack resolver that is wired into the API resolver.`,
    `- Template descriptors: **${report.summary.templateDescriptorCount}**; importable workflow bodies: **${report.summary.workflowBodyCount}**; descriptor-only assets: **${report.summary.descriptorOnlyCount}**.`,
    `- No live official L4 pack was found. Exact provider demand remains under-specified for descriptor-only L3/L5 assets.`,
    `- All manifest configuration groups still provide field keys rather than typed field definitions; the API derives generic string inputs for **${report.summary.nodesWithConfigFields}** nodes with configuration fields.`,
    '',
    '## Readiness interpretation',
    '',
    '- `runtime_ready` means manifest status, resolver declaration, and executor declarations align statically. It is not provider or E2E certification.',
    '- `degraded` means an explicit stub exists or the pack declares a non-runtime-enabled status.',
    '- `catalogue_only` means a composition pack contains descriptors but no node executors.',
    '- `blocked` means a declared node is not wired through the live API resolver path.',
    '',
    '## Pack matrix',
    '',
    '| Pack | Layer | Runtime status | Nodes | Implemented | Stub | Resolver | Templates | Bodies | Baseline | Direct tests |',
    '|---|---:|---|---:|---:|---:|---:|---:|---:|---|---|',
  );

  for (const pack of report.packs) {
    push(`| ${[
      pack.id,
      pack.layer,
      pack.runtimeStatus,
      pack.nodeCount,
      pack.implementedNodeCount,
      pack.stubNodeCount,
      `${pack.resolverDeclaredNodeCount}/${pack.nodeCount}`,
      pack.templateCount,
      pack.workflowBodyCount,
      pack.baselineReadiness,
      pack.testEvidence.direct.join(', ') || 'none',
    ].map(markdownCell).join(' | ')} |`);
  }

  push(
    '',
    '## Runtime dependency signals',
    '',
    '| Pack | Injected/runtime services | External/configuration requirements | Capability-only declarations |',
    '|---|---|---|---|',
  );
  for (const pack of report.packs.filter((candidate) => candidate.nodeCount > 0)) {
    push(`| ${[
      pack.id,
      pack.runtimeServices.join(', ') || 'self-contained',
      pack.externalRequirements.join(', ') || 'none identified',
      pack.capabilitiesWithoutNodes.join(', ') || 'none',
    ].map(markdownCell).join(' | ')} |`);
  }

  push(
    '',
    '## Declared stub nodes',
    '',
    '| Node | Pack | Capability | Referenced by graph-backed workflows |',
    '|---|---|---|---|',
  );
  const stubs = report.nodes.filter((node) => node.executorStatus === 'stub');
  for (const node of stubs) {
    push(`| ${[
      node.type,
      node.ownerPack,
      node.canonicalCapability,
      node.referencedByWorkflowBodies.join(', ') || 'none',
    ].map(markdownCell).join(' | ')} |`);
  }

  push(
    '',
    '## Template and workflow dependency matrix',
    '',
    '| Template | Owner | Required packs | Graph body | Nodes | Unknown nodes | Stub nodes | Result |',
    '|---|---|---|---|---:|---|---|---|',
  );
  for (const workflow of report.workflows) {
    push(`| ${[
      workflow.templateId,
      workflow.ownerPack,
      workflow.requiredPacks.join(', ') || 'none',
      workflow.workflowBodyPath || 'missing',
      workflow.nodeCount,
      workflow.unknownNodeTypes.join(', ') || 'none',
      workflow.stubNodeTypes.join(', ') || 'none',
      workflow.readiness,
    ].map(markdownCell).join(' | ')} |`);
  }

  push(
    '',
    '## Runtime claim contradictions',
    '',
    ...(report.contradictions.length > 0
      ? report.contradictions.map((item) => `- ${item}`)
      : ['- None. Manifest executor status and resolver wiring agree.']),
    '',
    '## Ranked blockers',
    '',
    '| Rank | Blocker | Affected assets | Why it matters | Recommended sprint |',
    '|---:|---|---:|---|---|',
  );
  report.rankedBlockers.forEach((blocker, index) => {
    push(`| ${[
      index + 1,
      blocker.id,
      blocker.affectedCount,
      blocker.reason,
      blocker.recommendedSprint,
    ].map(markdownCell).join(' | ')} |`);
  });

  push(
    '',
    '## Recommended activation waves',
    '',
    '### First activation wave',
    '',
    ...report.recommendations.firstActivationWave.map((item) => `- ${item}`),
    '',
    '### Connector decision',
    '',
    ...report.recommendations.connectorDecision.map((item) => `- ${item}`),
    '',
    '### First certification set',
    '',
    ...report.recommendations.firstCertificationSet.map((item) => `- ${item}`),
    '',
    '## Ad-hoc findings',
    '',
    ...report.adHocFindings.map((item) => `- ${item}`),
    '',
    '## Evidence limitations',
    '',
    ...report.limitations.map((item) => `- ${item}`),
    '',
  );

  return `${lines.join('\n')}\n`;
}

function main() {
  const checkOnly = process.argv.includes('--check');
  const apiResolverSource = readText(apiResolverPath);
  const testFiles = fs.existsSync(apiTestRoot)
    ? fs.readdirSync(apiTestRoot).filter((file) => file.endsWith('.spec.ts')).sort()
    : [];

  const packDirs = fs.readdirSync(officialRoot)
    .map((entry) => path.join(officialRoot, entry))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory())
    .sort();

  const packs = [];
  const nodes = [];
  const nodeByType = new Map();

  for (const packDir of packDirs) {
    const manifest = readJson(path.join(packDir, 'manifest.json'));
    const nodeManifests = readJson(path.join(packDir, 'nodes.json'));
    const packName = path.basename(packDir);
    const importName = packageImportName(packDir);
    const sourceIndexPath = path.join(packDir, 'src', 'index.ts');
    const sourceIndex = fs.existsSync(sourceIndexPath) ? readText(sourceIndexPath) : '';
    const apiWired = Boolean(importName && apiResolverSource.includes(`from '${importName}'`));
    const testEvidence = testEvidenceForPack(packName, testFiles);

    const packNodes = nodeManifests.map((node) => {
      const resolverDeclared = apiWired && sourceIndex.includes(node.type);
      const record = {
        type: node.type,
        displayName: node.displayName,
        canonicalCapability: node.canonicalCapability,
        ownerPack: manifest.id,
        executorStatus: node.executorStatus,
        nodeStatus: node.status,
        resolverDeclared,
        runtimeReadiness: !resolverDeclared
          ? 'missing_executor'
          : node.executorStatus === 'implemented' ? 'implemented' : 'stub',
        apiResolverWired: apiWired,
        configurationFieldKeys: [...new Set((node.configGroups ?? []).flatMap((group) => group.fields ?? []))],
        knowledgePackRequirements: node.knowledgePackRequirements ?? { required: [], recommended: [] },
        resourceBindings: node.resourceBindings ?? { supported: false, required: false },
        inputPortIds: (node.ports?.inputs ?? []).map((port) => port.id),
        outputPortIds: (node.ports?.outputs ?? []).map((port) => port.id),
        referencedByWorkflowBodies: [],
      };
      nodes.push(record);
      nodeByType.set(node.type, record);
      return record;
    });

    const templateDescriptors = (manifest.workflowTemplates ?? []).map((templatePath) =>
      path.join(packDir, templatePath),
    );
    const nodeCapabilities = new Set(packNodes.map((node) => node.canonicalCapability));
    const capabilityOnly = (manifest.capabilities ?? []).filter((capability) => !nodeCapabilities.has(capability));
    const runtimeDependencies = runtimeDependenciesByPack[manifest.id] ?? { services: [], external: [] };

    packs.push({
      directory: relative(packDir),
      id: manifest.id,
      displayName: manifest.displayName,
      version: manifest.version,
      layer: manifest.layer,
      status: manifest.status,
      runtimeStatus: manifest.runtimeStatus,
      dependencies: manifest.dependencies ?? [],
      capabilities: manifest.capabilities ?? [],
      capabilitiesWithoutNodes: capabilityOnly,
      manifestNodeTypes: manifest.nodes ?? [],
      importName,
      apiResolverWired: apiWired,
      runtimeServices: runtimeDependencies.services,
      externalRequirements: runtimeDependencies.external,
      nodeCount: packNodes.length,
      implementedNodeCount: packNodes.filter((node) => node.executorStatus === 'implemented').length,
      stubNodeCount: packNodes.filter((node) => node.executorStatus === 'stub').length,
      resolverDeclaredNodeCount: packNodes.filter((node) => node.resolverDeclared).length,
      nodesWithConfigFields: packNodes.filter((node) => node.configurationFieldKeys.length > 0).length,
      templateCount: templateDescriptors.length,
      workflowBodyCount: templateDescriptors.filter((descriptor) => findWorkflowBody(descriptor)).length,
      testEvidence,
      templateDescriptorPaths: templateDescriptors.map(relative),
      baselineReadiness: inferPackReadiness(manifest, packNodes, apiWired || packNodes.length === 0),
      verification: manifest.verification ?? {},
    });
  }

  const workflows = [];
  for (const pack of packs) {
    for (const descriptorPath of pack.templateDescriptorPaths.map((item) => path.join(repoRoot, item))) {
      const descriptor = readJson(descriptorPath);
      const workflowBodyPath = findWorkflowBody(descriptorPath);
      const workflow = workflowBodyPath ? readJson(workflowBodyPath) : null;
      const workflowNodes = workflow ? extractWorkflowNodes(workflow) : [];
      const connections = workflow ? extractWorkflowConnections(workflow) : [];
      const nodeTypes = [...new Set(workflowNodes.map((node) => node.type).filter(Boolean))].sort();
      const unknownNodeTypes = nodeTypes.filter((type) => !nodeByType.has(type));
      const stubNodeTypes = nodeTypes.filter((type) => nodeByType.get(type)?.executorStatus === 'stub');
      const unresolvedNodeTypes = nodeTypes.filter((type) => !nodeByType.get(type)?.resolverDeclared);
      const missingRequiredPacks = (descriptor.requiredPacks ?? []).filter(
        (packId) => !packs.some((candidate) => candidate.id === packId),
      );
      const graphIssues = workflow ? validateWorkflowGraph(workflowNodes, connections, nodeByType) : [];

      let readiness = 'graph_ready';
      if (!workflowBodyPath) readiness = 'descriptor_only';
      else if (missingRequiredPacks.length || unknownNodeTypes.length || unresolvedNodeTypes.length || graphIssues.length) readiness = 'blocked';
      else if (stubNodeTypes.length) readiness = 'degraded';

      const record = {
        templateId: descriptor.templateId,
        displayName: descriptor.displayName,
        ownerPack: descriptor.ownerPack,
        status: descriptor.status,
        maturity: descriptor.maturity,
        summary: descriptor.summary,
        descriptorPath: relative(descriptorPath),
        workflowBodyPath: workflowBodyPath ? relative(workflowBodyPath) : null,
        requiredPacks: descriptor.requiredPacks ?? [],
        recommendedKnowledgePacks: descriptor.recommendedKnowledgePacks ?? [],
        missingRequiredPacks,
        nodeCount: workflowNodes.length,
        connectionCount: connections.length,
        nodeTypes,
        unknownNodeTypes,
        unresolvedNodeTypes,
        stubNodeTypes,
        graphIssues,
        readiness,
      };
      workflows.push(record);

      for (const type of nodeTypes) {
        nodeByType.get(type)?.referencedByWorkflowBodies.push(record.templateId);
      }
    }
  }

  const descriptorOnly = workflows.filter((workflow) => workflow.readiness === 'descriptor_only');
  const stubNodes = nodes.filter((node) => node.executorStatus === 'stub');
  const genericConfigNodes = nodes.filter((node) => node.configurationFieldKeys.length > 0);
  const degradedPacks = packs.filter((pack) => pack.baselineReadiness === 'degraded');
  const contradictions = [];
  for (const node of nodes) {
    if (node.executorStatus === 'implemented' && !node.resolverDeclared) {
      contradictions.push(`${node.ownerPack}: ${node.type} is declared implemented but resolver wiring is missing`);
    }
  }
  for (const pack of packs) {
    const packNodes = nodes.filter((node) => node.ownerPack === pack.id);
    if (pack.runtimeStatus === 'runtime_enabled' && packNodes.some((node) => node.executorStatus !== 'implemented')) {
      contradictions.push(`${pack.id}: runtime_enabled contains a non-implemented executor`);
    }
    if (pack.baselineReadiness === 'runtime_ready' && packNodes.some((node) => node.runtimeReadiness !== 'implemented')) {
      contradictions.push(`${pack.id}: runtime_ready contains a stub or missing executor`);
    }
  }

  const rankedBlockers = [
    {
      id: 'missing_workflow_graph_bodies',
      affectedCount: descriptorOnly.length,
      reason: 'Descriptor-only L3/L5 assets cannot prove node, service, resource, connector, or port dependencies and cannot be imported as runnable workflows.',
      recommendedSprint: 'S27.0 follow-up / S27.6 activation',
    },
    {
      id: 'generic_string_configuration',
      affectedCount: genericConfigNodes.length,
      reason: 'Official configGroups declare keys only, so the API derives optional string fields instead of typed, validated, resource-, knowledge-, or connection-aware controls.',
      recommendedSprint: 'S27.2',
    },
    {
      id: 'explicit_stub_executors',
      affectedCount: stubNodes.length,
      reason: `Declared stubs (${stubNodes.map((node) => node.type).join(', ')}) block any graph that requires their real behavior.`,
      recommendedSprint: 'S27.2 / S27.4 / S27.5 by demand',
    },
    {
      id: 'missing_l4_provider_catalogue',
      affectedCount: packs.filter((pack) => pack.layer === 'L4').length === 0 ? 1 : 0,
      reason: 'No live official L4 pack exists; provider selection must follow workflow graph completion rather than assumptions.',
      recommendedSprint: 'S27.3-S27.4',
    },
    {
      id: 'degraded_runtime_status',
      affectedCount: degradedPacks.length,
      reason: `${degradedPacks.map((pack) => pack.id).join(', ')} declare or derive degraded readiness and require explicit service/configuration verification.`,
      recommendedSprint: 'S27.2-S27.5',
    },
  ].filter((item) => item.affectedCount > 0);

  const report = {
    schemaVersion: 'lados.phase27.runtime-baseline.v1',
    generatedAt: new Date().toISOString(),
    scope: {
      officialRoot: relative(officialRoot),
      archivedPacksExcluded: true,
      evidenceType: 'static_repository',
    },
    summary: {
      packCount: packs.length,
      executablePackCount: packs.filter((pack) => pack.nodeCount > 0).length,
      compositionPackCount: packs.filter((pack) => pack.nodeCount === 0).length,
      nodeCount: nodes.length,
      implementedNodeCount: nodes.filter((node) => node.executorStatus === 'implemented').length,
      stubNodeCount: stubNodes.length,
      resolverDeclaredNodeCount: nodes.filter((node) => node.resolverDeclared).length,
      runtimeReadyPackCount: packs.filter((pack) => pack.baselineReadiness === 'runtime_ready').length,
      degradedPackCount: degradedPacks.length,
      blockedPackCount: packs.filter((pack) => pack.baselineReadiness === 'blocked').length,
      catalogueOnlyPackCount: packs.filter((pack) => pack.baselineReadiness === 'catalogue_only').length,
      templateDescriptorCount: workflows.length,
      workflowBodyCount: workflows.filter((workflow) => workflow.workflowBodyPath).length,
      descriptorOnlyCount: descriptorOnly.length,
      graphReadyWorkflowCount: workflows.filter((workflow) => workflow.readiness === 'graph_ready').length,
      degradedWorkflowCount: workflows.filter((workflow) => workflow.readiness === 'degraded').length,
      blockedWorkflowCount: workflows.filter((workflow) => workflow.readiness === 'blocked').length,
      nodesWithConfigFields: genericConfigNodes.length,
      l4PackCount: packs.filter((pack) => pack.layer === 'L4').length,
    },
    contradictions,
    packs,
    nodes,
    workflows,
    rankedBlockers,
    recommendations: {
      firstActivationWave: [
        'Complete the 13 missing workflow graph bodies before using L3/L5 assets to choose connectors.',
        'Activate Document Intelligence first: implement PDF/DOCX extraction and document-library persistence because document handling is a dependency of multiple solution/template packs.',
        'Finish typed configuration for Workflow Foundation, Human Work, Document Intelligence, Communication, and the professional packs used by the first graph bodies.',
        'Add production-strict missing-executor behavior before certifying any workflow.',
      ],
      connectorDecision: [
        'Do not select Microsoft 365 versus Google Workspace from descriptor prose alone.',
        'After graph bodies exist, extract exact triggers/actions and score provider demand across the prepared workflows.',
        'Generic HTTP/webhook, file/attachment, connection profile, OAuth, retry, pagination, and rate-limit foundations remain provider-neutral prerequisites.',
      ],
      firstCertificationSet: [
        'Author and validate lados.solution.contractor_ops.trip_dispatch_and_completion first because its declared dependencies (Asset Fleet and Task Case) are both statically runtime-ready and contain no declared stubs.',
        'Use lados.solution.contractor_ops.fleet_maintenance as the second business graph because Asset Fleet, Task Case, and Procurement are statically runtime-ready.',
        'Video Production script-to-scene-plan is graph-backed but degraded by lados.video.render_scenes; certify an inspection/planning-only variant or implement the render backend before full certification.',
        'Quran Media main and revision workflows are graph-backed and statically resolvable; they require configuration/service and live import/run verification rather than graph authoring.',
        'Begin QS graph authoring after Document Intelligence PDF/DOCX and storage gaps are resolved, because all three QS Practice descriptors depend on that degraded pack.',
      ],
    },
    adHocFindings: [
      'Phase 27 was correctly numbered after existing Phase 25 and reserved Phase 26 plans were discovered.',
      'Production-strict execution and resolver-backed API readiness landed in S27.1; this report mirrors the same state vocabulary for build-time checks.',
      'The Quran Media source header still describes all nodes as stubs while nodes.json and the manifest now declare 13 implemented executors; documentation/runtime comments have drifted.',
      'Composition descriptors validate required pack IDs but do not declare the path to a workflow body, even where sibling workflow JSON exists; matching currently relies on filename convention.',
      'Direct spec files exist for every executable pack, but direct spec presence alone is not proof of provider or live E2E readiness.',
    ],
    limitations: [
      'This report does not read environment files and does not evaluate credentials or secrets.',
      'Build evidence is static API import wiring plus node-type declaration; the runtime API additionally probes the live resolver factory.',
      'Test evidence is filename-based. S27.1/S27.5 should add machine-readable test evidence or probe results.',
      'Generic configuration readiness is inferred from the current official loader, which derives string fields from configGroups.',
      'Provider readiness cannot be certified without sandbox/test accounts and real round trips.',
      'Supabase migration/application state and browser import/run behavior are outside this static baseline.',
    ],
  };

  if (!checkOnly) {
    ensureParent(jsonOutputPath);
    ensureParent(markdownOutputPath);
    fs.writeFileSync(jsonOutputPath, `${JSON.stringify(report, null, 2)}\n`, 'utf8');
    fs.writeFileSync(markdownOutputPath, renderMarkdown(report), 'utf8');
  }

  console.log(checkOnly ? 'Phase 27 runtime readiness claims checked.' : 'Phase 27 runtime baseline generated.');
  console.log(`JSON: ${relative(jsonOutputPath)}`);
  console.log(`Markdown: ${relative(markdownOutputPath)}`);
  console.log(`Packs: ${report.summary.packCount}`);
  console.log(`Nodes: ${report.summary.nodeCount}`);
  console.log(`Stubs: ${report.summary.stubNodeCount}`);
  console.log(`Templates: ${report.summary.templateDescriptorCount}`);
  console.log(`Workflow bodies: ${report.summary.workflowBodyCount}`);
  console.log(`Descriptor-only: ${report.summary.descriptorOnlyCount}`);
  console.log(`Contradictions: ${report.contradictions.length}`);
  if (report.contradictions.length > 0) {
    for (const contradiction of report.contradictions) console.error(`- ${contradiction}`);
    process.exitCode = 1;
  }
}

main();
