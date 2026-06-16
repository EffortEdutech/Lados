/**
 * Organization and project DTOs — used in Sprint 2 API payloads.
 */
import type { OrganizationId, ProjectId, UserId } from './ids';
import type { OrganizationRole, ProjectStatus } from './status';

// ─── Organization ─────────────────────────────────────────────────────────────

export interface Organization {
  id: OrganizationId;
  name: string;
  slug: string;
  logoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface OrganizationMember {
  userId: UserId;
  organizationId: OrganizationId;
  role: OrganizationRole;
  joinedAt: string;
}

export interface CreateOrganizationDto {
  name: string;
  slug: string;
}

// ─── Project ──────────────────────────────────────────────────────────────────

export interface Project {
  id: ProjectId;
  organizationId: OrganizationId;
  name: string;
  code: string;   // e.g. "PROJ-001"
  description?: string;
  status: ProjectStatus;
  currency?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateProjectDto {
  name: string;
  code: string;
  description?: string;
  currency?: string;
}
