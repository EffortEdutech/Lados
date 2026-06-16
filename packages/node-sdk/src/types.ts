/**
 * @qsos/node-sdk — Core types
 * Sprint 5 (S5-001)
 */

// ── Port types ──────────────────────────────────────────────────────────────

export type PortDataType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'object'
  | 'array'
  | 'file'
  | 'json'
  | 'boq'
  | 'any';

export interface NodePort {
  id: string;
  label: string;
  type: PortDataType;
  required?: boolean;
  description?: string;
  /** JSON Schema for the data this port accepts/emits */
  schema?: Record<string, unknown>;
}

// ── Configuration schema ────────────────────────────────────────────────────

export type ConfigFieldType =
  | 'string'
  | 'number'
  | 'boolean'
  | 'select'
  | 'multiselect'
  | 'textarea'
  | 'file'
  | 'json'
  | 'secret';

export interface ConfigFieldOption {
  value: string;
  label: string;
}

export interface ConfigField {
  key: string;
  label: string;
  type: ConfigFieldType;
  required?: boolean;
  defaultValue?: unknown;
  description?: string;
  placeholder?: string;
  options?: ConfigFieldOption[];         // for select / multiselect
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
    message?: string;
  };
}

export type ConfigSchema = ConfigField[];

// ── UI schema ───────────────────────────────────────────────────────────────

export type NodeCategory =
  | 'core'
  | 'qs'
  | 'procurement'
  | 'document'
  | 'ai'
  | 'integration';

export interface NodeUISchema {
  title: string;
  icon?: string;
  category: NodeCategory;
  color?: string;          // hex, e.g. '#3B82F6'
  description?: string;
  helpUrl?: string;
  /** Groups config fields into sections for the property panel */
  sections?: Array<{
    title: string;
    fieldKeys: string[];
  }>;
}

// ── Node metadata ───────────────────────────────────────────────────────────

export interface NodeMetadata {
  /** Globally unique dotted-path identifier e.g. "qs.read_boq" */
  type: string;
  name: string;
  version: string;
  description?: string;
  author?: string;
  tags?: string[];
  /** Pack this node belongs to */
  packId: string;
}

// ── Full node manifest (static definition stored in DB) ────────────────────

export interface NodeManifest {
  metadata: NodeMetadata;
  inputs: NodePort[];
  outputs: NodePort[];
  configSchema: ConfigSchema;
  uiSchema: NodeUISchema;
}

// ── Execution context ───────────────────────────────────────────────────────

export interface NodeLogger {
  info(message: string, data?: unknown): void;
  warn(message: string, data?: unknown): void;
  error(message: string, data?: unknown): void;
}

export interface NodeContext {
  executionId: string;
  workflowId: string;
  projectId: string;
  organizationId: string;
  userId: string;
  /** Resolved configuration values for this node instance */
  config: Record<string, unknown>;
  /** Outputs from upstream nodes keyed by nodeId */
  inputs: Record<string, unknown>;
  logger: NodeLogger;
  /** Runtime variables set at workflow level */
  variables: Record<string, unknown>;
}

// ── Execution result ────────────────────────────────────────────────────────

export type ExecutionStatus = 'success' | 'failure' | 'pending_approval' | 'skipped';

export interface NodeExecuteResult {
  status: ExecutionStatus;
  /** Port outputs keyed by port id */
  outputs: Record<string, unknown>;
  /** Logs captured during execution */
  logs?: string[];
  /** Human-readable summary */
  summary?: string;
  /** If status === 'failure' */
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
  /** If status === 'pending_approval' */
  approvalRequest?: {
    title: string;
    description: string;
    assigneeRole?: string;
  };
}

// ── Validation result ───────────────────────────────────────────────────────

export interface ValidationIssue {
  field: string;
  severity: 'error' | 'warning';
  message: string;
}

export interface NodeValidationResult {
  valid: boolean;
  issues: ValidationIssue[];
}
