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
import type { OfficialNodePort, OfficialPackSkeleton } from '@lados/pack-sdk';
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
            // Skeleton configGroups reference field keys only (no ConfigField
            // definitions yet) — real config_schema arrives with each node's
            // executor in its implementation wave (S2-S6).
            config_schema: [],
            ui_schema: {},
            is_enabled: true,
            canonical_capability: node.canonicalCapability,
            executor_status: node.executorStatus,
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
