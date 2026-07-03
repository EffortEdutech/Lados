import type { OfficialCompatibilityAlias } from './types';

export const officialCompatibilityAliases: OfficialCompatibilityAlias[] = [
  {
    prototypeType: 'core.condition',
    officialType: 'lados.workflow.condition',
    officialPack: 'lados.workflow-foundation',
    canonicalCapability: 'workflow.control.condition',
    status: 'planned',
    migrationMode: 'alias',
    notes: 'Direct workflow control replacement.',
  },
  {
    prototypeType: 'core.logger',
    officialType: 'lados.workflow.write_log',
    officialPack: 'lados.workflow-foundation',
    canonicalCapability: 'workflow.log.write',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'resource.create',
    officialType: 'lados.resource.create',
    officialPack: 'lados.resource-operations',
    canonicalCapability: 'resource.create',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'artifact.write',
    officialType: 'lados.artifact.write',
    officialPack: 'lados.resource-operations',
    canonicalCapability: 'artifact.write',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'project.save_artifact',
    officialType: 'lados.artifact.write',
    officialPack: 'lados.resource-operations',
    canonicalCapability: 'artifact.write',
    status: 'planned',
    migrationMode: 'merge',
    notes: 'Legacy project artifact writer merges into official artifact write capability.',
  },
  {
    prototypeType: 'core.human_approval',
    officialType: 'lados.human.request_approval',
    officialPack: 'lados.human-work',
    canonicalCapability: 'human.approval.request',
    status: 'planned',
    migrationMode: 'merge',
  },
  {
    prototypeType: 'foundation.request_approval',
    officialType: 'lados.human.request_approval',
    officialPack: 'lados.human-work',
    canonicalCapability: 'human.approval.request',
    status: 'planned',
    migrationMode: 'merge',
  },
  {
    prototypeType: 'document.upload_file',
    officialType: 'lados.document.upload_file',
    officialPack: 'lados.document-intelligence',
    canonicalCapability: 'document.file.upload',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'document.read_excel',
    officialType: 'lados.document.read_excel',
    officialPack: 'lados.document-intelligence',
    canonicalCapability: 'document.table.read_excel',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'qs.read_boq',
    officialType: 'lados.qs.read_boq',
    officialPack: 'lados.qs-commercial',
    canonicalCapability: 'qs.boq.read',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'qs.classify_trade',
    officialType: 'lados.qs.classify_trade',
    officialPack: 'lados.qs-commercial',
    canonicalCapability: 'qs.trade.classify',
    status: 'planned',
    migrationMode: 'alias',
  },
  {
    prototypeType: 'construction.assess_progress_claim',
    officialType: 'lados.qs.assess_progress_claim',
    officialPack: 'lados.qs-commercial',
    canonicalCapability: 'qs.claim.assess',
    status: 'planned',
    migrationMode: 'manual_review',
    notes: 'Move from construction prototype to QS Commercial with explicit human review boundary.',
  },
];

export function resolveOfficialCompatibilityAlias(
  prototypeType: string,
): OfficialCompatibilityAlias | undefined {
  return officialCompatibilityAliases.find((alias) => alias.prototypeType === prototypeType);
}
