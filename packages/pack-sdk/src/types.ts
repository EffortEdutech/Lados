/**
 * @qsos/pack-sdk — Core types
 * Sprint 5 (S5-002)
 */

import type { NodeManifest } from '@qsos/node-sdk';

// ── Pack manifest ────────────────────────────────────────────────────────────

export interface PackManifest {
  /** Unique dotted-path ID e.g. "qsos.qs-pack" */
  id: string;
  version: string;
  displayName: string;
  description?: string;
  author?: string;
  /** Minimum Node SDK version required */
  sdkVersion?: string;
  /** Other pack IDs this pack depends on */
  dependencies?: string[];
  /** Node type IDs this pack provides */
  nodes: string[];
  /** Permissions this pack requires */
  permissions?: PackPermission[];
  /** Pack icon URL or name */
  icon?: string;
  /** Brand colour for UI */
  color?: string;
}

// ── Permission ───────────────────────────────────────────────────────────────

export type PackPermissionScope =
  | 'read:files'
  | 'write:files'
  | 'read:database'
  | 'write:database'
  | 'call:ai'
  | 'call:external-api'
  | 'read:secrets'
  | 'send:email'
  | 'send:notification';

export interface PackPermission {
  scope: PackPermissionScope;
  reason: string;
}

// ── Node registration ────────────────────────────────────────────────────────

export interface PackNodeRegistration {
  manifest: NodeManifest;
  /** Pack that owns this node */
  packId: string;
  /** Whether this node is enabled by default when pack is installed */
  enabledByDefault?: boolean;
}

// ── Validation ───────────────────────────────────────────────────────────────

export interface PackValidationIssue {
  field: string;
  message: string;
}

export interface PackValidationResult {
  valid: boolean;
  issues: PackValidationIssue[];
}
