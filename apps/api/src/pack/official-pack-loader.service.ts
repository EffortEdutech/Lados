/**
 * OfficialPackLoaderService — Phase 21 S1 (Official Runtime Foundation)
 *
 * Registers Phase 20B official Capability Pack skeletons (packs/official/*)
 * into `packs` and `registered_nodes`, alongside — and without touching —
 * the existing prototype packs synced by PackInstallerService.
 *
 * Deliberately separate from PackInstallerService:
 *   - different source of truth (JSON files on disk vs. compiled TS imports)
 *   - different failure blast radius (a broken official skeleton must never
 *     affect prototype pack sync, which is what the live app still runs on)
 *
 * Official packs are registered visible (is_enabled/status = active) per the
 * S1 gate ("official packs visible in node registry, flagged non-executable
 * until their wave lands") — `runtime_status` / `executor_status` are the
 * non-executable flags, not visibility flags. No executor exists yet for
 * any official skeleton node, so nothing here can run on a workflow canvas.
 */
import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import type { OfficialNodeConfigGroup, OfficialNodeManifest, OfficialNodePort, OfficialPackSkeleton } from '@lados/pack-sdk';
import { SupabaseService } from '../common/supabase/supabase.service';
import { loadOfficialPackSkeletons, type OfficialPackLoadIssue } from './official-pack-loader';

export interface OfficialPackSyncResult {
  packsSynced: string[];
  nodesSynced: number;
  loadIssues: OfficialPackLoadIssue[];
  errors: string[];
}

function mapPorts(ports: OfficialNodePort[]): Array<Record<string, unknown>> {
  return ports.map((port) => ({
    id: port.id,
    label: port.label,
    type: port.dataType,
    required: port.required ?? false,
  }));
}

/** "clearedBy" / "cleared_by" → "Cleared By" */
export function humanizeFieldKey(key: string): string {
  const spaced = key
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ');
  return spaced
    .split(' ')
    .filter(Boolean)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Phase 21 S7 (UI Alignment) — generic config_schema/ui_schema derivation.
 *
 * nodes.json's `configGroups` only ever declares field KEYS grouped under a
 * section id/label (`{ id, label, fields: string[] }`) — it was never a
 * full ConfigField definition (type, widget, options, validation). Every
 * official node was previously loaded with a hardcoded `config_schema: []`
 * (the stale comment here claimed real schemas would "arrive with each
 * node's executor in its implementation wave (S2-S6)" — they never did;
 * no wave touched this file). The practical effect: PropertyPanel renders
 * "This skill has no configuration" for every official node regardless of
 * executor status, so no field on any S2-S6.1 node can be configured from
 * the canvas today.
 *
 * This derives a HONEST, GENERIC fallback rather than fabricating richer
 * per-field UI intent (select options, resource-picker types, validation
 * rules) that nothing in the manifest actually specifies: every declared
 * field becomes a plain `type:'string'` text input with a humanized label,
 * and each node's configGroups become ui_schema.sections so
 * PropertyPanel/ManifestSection still group fields the way the manifest
 * author organized them. This is a floor, not a ceiling — assigning
 * precise field types (number/select/date/toggle/data_pack_item/
 * resource-picker) per node remains explicit follow-up work (tracked in
 * the Phase 21 checklist), not something to guess at silently here.
 */
export function deriveConfigSchema(manifest: OfficialNodeManifest): {
  configSchema: Array<Record<string, unknown>>;
  uiSchema: { sections: Array<{ title: string; fieldKeys: string[] }> };
} {
  const groups: OfficialNodeConfigGroup[] = manifest.configGroups ?? [];
  const seen = new Set<string>();
  const configSchema: Array<Record<string, unknown>> = [];

  for (const group of groups) {
    for (const key of group.fields) {
      if (seen.has(key)) continue;
      seen.add(key);
      configSchema.push({
        key,
        label: humanizeFieldKey(key),
        type: 'string',
        required: false,
      });
    }
  }

  const uiSchema = {
    sections: groups.map((group) => ({ title: group.label, fieldKeys: group.fields })),
  };

  return { configSchema, uiSchema };
}

@Injectable()
export class OfficialPackLoaderService implements OnModuleInit {
  private readonly logger = new Logger(OfficialPackLoaderService.name);

  constructor(private readonly supabase: SupabaseService) {}

  async onModuleInit(): Promise<void> {
    try {
      const result = await this.syncAll();
      this.logger.log(
        `OfficialPackLoader: sync complete - packs: [${result.packsSynced.join(', ') || 'none'}] ` +
          `nodes: ${result.nodesSynced}` +
          (result.loadIssues.length ? ` loadIssues: ${result.loadIssues.length}` : '') +
          (result.errors.length ? ` errors: [${result.errors.join(', ')}]` : ''),
      );
      for (const issue of result.loadIssues) {
        this.logger.warn(`OfficialPackLoader: skipped ${issue.packDir} - ${issue.message}`);
      }
    } catch (err) {
      // Never block API startup on official skeleton sync — these packs are
      // manifest-only and non-executable regardless of whether this runs.
      this.logger.error(`OfficialPackLoader: startup sync failed - ${String(err)}`);
    }
  }

  async syncAll(): Promise<OfficialPackSyncResult> {
    const { packs, issues } = loadOfficialPackSkeletons();
    const result: OfficialPackSyncResult = {
      packsSynced: [],
      nodesSynced: 0,
      loadIssues: issues,
      errors: [],
    };

    for (const skeleton of packs) {
      try {
        await this.registerPack(skeleton);
        result.packsSynced.push(skeleton.manifest.id);
      } catch (err) {
        result.errors.push(`${skeleton.manifest.id}: ${String(err)}`);
        continue;
      }

      try {
        const nodeCount = await this.registerNodes(skeleton);
        result.nodesSynced += nodeCount;
      } catch (err) {
        result.errors.push(`${skeleton.manifest.id} nodes: ${String(err)}`);
      }
    }

    return result;
  }

  private async registerPack(skeleton: OfficialPackSkeleton): Promise<void> {
    const { manifest } = skeleton;

    const { error } = await this.supabase.admin
      .from('packs')
      .upsert(
        {
          id: manifest.id,
          display_name: manifest.displayName,
          description: manifest.description ?? null,
          author: 'Lados Platform',
          version: manifest.version,
          icon: manifest.visual.icon,
          color: manifest.visual.paletteGroup,
          is_official: true,
          is_enabled: true,
          status: 'active',
          dependencies: manifest.dependencies,
          layer: manifest.layer,
          runtime_status: manifest.runtimeStatus,
          installed_from: 'official-skeleton-sync',
          // Phase 21 S9.1 (gap closure) — see migration
          // 0067_packs_resource_views.sql. Empty array for packs that own
          // no user-facing Workspace Resource type (most L0/L1 packs).
          resource_views: manifest.resourceViews ?? [],
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' },
      );

    if (error) throw new Error(error.message);
  }

  private async registerNodes(skeleton: OfficialPackSkeleton): Promise<number> {
    const { manifest, nodes } = skeleton;
    let synced = 0;

    for (const node of nodes) {
      const { configSchema, uiSchema } = deriveConfigSchema(node);

      const { error } = await this.supabase.admin
        .from('registered_nodes')
        .upsert(
          {
            type: node.type,
            pack_id: manifest.id,
            name: node.displayName,
            description: node.intent,
            version: manifest.version,
            category: node.category,
            icon: node.icon,
            color: manifest.visual.paletteGroup,
            tags: node.searchKeywords ?? [],
            inputs: mapPorts(node.ports.inputs),
            outputs: mapPorts(node.ports.outputs),
            // Phase 21 S7 (UI Alignment): generic config_schema/ui_schema
            // derived mechanically from configGroups — see deriveConfigSchema
            // doc comment above for why this is a floor, not a ceiling.
            // Previously hardcoded to [] / {} for every official node
            // regardless of executor status, which left PropertyPanel
            // rendering "This skill has no configuration" everywhere.
            config_schema: configSchema,
            ui_schema: uiSchema,
            is_enabled: true,
            canonical_capability: node.canonicalCapability,
            executor_status: node.executorStatus,
            // Phase 21 S7 (UI Alignment): persist the manifest's canvasUx
            // block (minWidth/minHeight/maxVisiblePortsPerSide) so the
            // canvas can honor per-node sizing instead of a fixed 260px
            // card — see migration 0061_registered_nodes_canvas_ux.sql.
            canvas_ux: node.canvasUx ?? null,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'type' },
        );

      if (error) throw new Error(`${node.type}: ${error.message}`);
      synced++;
    }

    return synced;
  }
}
