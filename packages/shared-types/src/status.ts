/**
 * Status enums shared across the QS-OS domain.
 */

export const WorkflowStatus = {
  DRAFT: 'draft',
  PUBLISHED: 'published',
  ARCHIVED: 'archived',
} as const;
export type WorkflowStatus = (typeof WorkflowStatus)[keyof typeof WorkflowStatus];

export const ExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  CANCELLED: 'cancelled',
} as const;
export type ExecutionStatus = (typeof ExecutionStatus)[keyof typeof ExecutionStatus];

export const NodeExecutionStatus = {
  PENDING: 'pending',
  RUNNING: 'running',
  COMPLETED: 'completed',
  FAILED: 'failed',
  SKIPPED: 'skipped',
} as const;
export type NodeExecutionStatus = (typeof NodeExecutionStatus)[keyof typeof NodeExecutionStatus];

export const OrganizationRole = {
  OWNER: 'owner',
  ADMIN: 'admin',
  MEMBER: 'member',
  VIEWER: 'viewer',
} as const;
export type OrganizationRole = (typeof OrganizationRole)[keyof typeof OrganizationRole];

export const ProjectStatus = {
  ACTIVE: 'active',
  ON_HOLD: 'on_hold',
  COMPLETED: 'completed',
  ARCHIVED: 'archived',
} as const;
export type ProjectStatus = (typeof ProjectStatus)[keyof typeof ProjectStatus];
