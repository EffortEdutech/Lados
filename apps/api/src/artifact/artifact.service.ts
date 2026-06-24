/**
 * ArtifactService
 *
 * Manages lados_artifacts — the project-scoped, versioned key-value store
 * used for inter-workflow data handoff within a project.
 *
 * Design:
 *   - artifact.write node → upsertArtifact() → increments version, appends to lados_artifact_versions
 *   - artifact.read node  → readArtifact()   → returns current value or null
 *   - Emits ArtifactWritten event on every write
 *
 * See docs/LCE_V1/Lados_Core_Engine_V1_Implementation_Blueprint.md §4.10
 *
 * Phase 9 Correction — replaces legacy project_artifacts table.
 */
import { Injectable, NotFoundException } from '@nestjs/common';
import { SupabaseService }  from '../common/supabase/supabase.service';
import { EventBusService }  from '../event-bus/event-bus.service';

// ── Public types ──────────────────────────────────────────────────────────────

export interface ArtifactRecord {
  id:              string;
  organisation_id: string;
  project_id:      string;
  workflow_id:     string | null;
  run_id:          string | null;
  artifact_key:    string;
  artifact_type:   'json' | 'text' | 'file';
  data:            Record<string, unknown> | null;
  file_url:        string | null;
  version:         number;
  created_by:      string | null;
  created_at:      string;
  updated_at:      string;
}

export interface UpsertArtifactParams {
  organisationId: string;
  projectId:      string;
  key:            string;
  type?:          'json' | 'text' | 'file';
  data?:          Record<string, unknown>;
  fileUrl?:       string;
  workflowId?:    string;
  runId?:         string;
  createdBy?:     string;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class ArtifactService {
  constructor(
    private readonly supabase:  SupabaseService,
    private readonly eventBus:  EventBusService,
  ) {}

  // ── Read ──────────────────────────────────────────────────────────────────

  async listArtifacts(projectId: