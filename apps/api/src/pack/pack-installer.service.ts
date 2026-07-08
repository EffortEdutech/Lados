/**
 * PackInstallerService - Phase 8 / Phase 14 upgrade
 *
 * Write-side of the Pack system. Handles:
 *   - syncAll()           - on startup, upserts all compiled-in packs to the DB
 *   - registerPack()      - upsert a single pack manifest to the packs table
 *   - enablePack()        - set is_enabled=true + status='active' on pack + its nodes
 *   - disablePack()       - set is_enabled=false + status='disabled' on pack + its nodes
 *   - healthCheckAll()    - Phase 14: try to resolve every registered node; log broken ones
 *   - getResourceViews()  - aggregate resource view configs from active packs
 *   - getWorkflowTemplates() - list template paths for a pack
 *   - syncNodeManifests() - Phase 1G: upsert NodeManifestV2 declarations to registered_nodes
 *
 * "Compiled-in packs" = TypeScript workspace packages statically linked into
 * this binary. Dynamic bundle loading (install from URL/upload) is deferred
 * to post-Contractor-Edition deployment.
 */

import {
  Injectable,
  Logger,
  OnModuleInit,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseService }     from '../common/supabase/supabase.service';
import { PackRegistryService } from './pack-registry.service';
import type { PackSyncResult, PackHealth } from './pack.types';

// Phase 21 S9 (prototype-pack removal, 2026-07-04): the 9 legacy prototype
// pack-level and node-level manifest imports (core/foundation/qs/document/
// procurement/contractor/construction/finance/notifications-pack) were
// removed from this file along with their COMPILED_PACKS/MANIFEST_MAP/
// MANIFEST_TO_DB_PACK_ID/PACK_PREFIXES entries and ALL_NODE_MANIFESTS
// spreads. Every node type they registered has a canonical official-pack
// successor, and no live workflow/template references any prototype node
// type (confirmed via migration 0064). This also removes the resurrection
// risk noted in the Phase 21 checklist: syncNodeManifests() previously
// unconditionally re-enabled (is_enabled: true) every registered_nodes row
// for these packs on every API restart, undoing migration 0063's
// soft-archive; migration 0065 hard-deletes the underlying rows so there is
// nothing left to resurrect. Prototype source is preserved, unbuilt, under
// archived/packs/ — see Lados_V4_Phase21_Checklist.md Handover 2026-07-04 (8).
import type { PackResourceDefinition }      from '@lados/pack-sdk';

// -- Node-level manifests (NodeManifestV2) — Phase 1G ----------------------------
import type { NodeManifestV2 }                            from '@lados/node-sdk';

// -- Known node-type prefixes per compiled pack ------------------------------------
//
// Used for startup health check without requiring full service injection.
// A node type is "resolvable" if its prefix matches the pack's known namespace.

const PACK_PREFIXES: Record<string, string[]> = {};

// -- In-memory manifest map -------------------------------------------------------

const MANIFEST_MAP: Record<string, { resources?: PackResourceDefinition[] }> = {};

// -- Node manifest registry (Phase 1G) --------------------------------------------
//
// Maps manifest.packId (short form in pack source) to DB packs.id (lados. prefixed).
// All packs now use short-form packId in their manifests (e.g. 'contractor-pack', 'core-pack').

const MANIFEST_TO_DB_PACK_ID: Record<string, string> = {};

const CATEGORY_COLOR: Record<string, string> = {
  core:         '#6B7280',
  resource:     '#8B5CF6',
  event:        '#EAB308',
  document:     '#F59E0B',
  ai:           '#10B981',
  procurement:  '#3B82F6',
  qs:           '#6366F1',
  fleet:        '#F59E0B',
  finance:      '#059669',
  integration:  '#8B5CF6',
  notification: '#6366F1',
  scheduler:    '#6B7280',
  utility:      '#9CA3AF',
  construction: '#F97316',  // Phase 7 — orange
};

const ALL_NODE_MANIFESTS: NodeManifestV2[] = [];

// -- Compiled pack registry -------------------------------------------------------

interface CompiledPackEntry {
  dbId:          string;
  version:       string;
  displayName:   string;
  description:   string;
  author:        string;
  icon?:         string;
  color?:        string;
  isOfficial:    boolean;
  dependencies:  string[];
  installedFrom: string;
}

const COMPILED_PACKS: CompiledPackEntry[] = [];

// -- Service ----------------------------------------------------------------------

@Injectable()
export class PackInstallerService implements OnModuleInit {
  private readonly logger = new Logger(PackInstallerService.name);

  constructor(
    private readonly supabase:  SupabaseService,
    private readonly registry:  PackRegistryService,
  ) {}

  // -- Lifecycle -----------------------------------------------------------------

  async onModuleInit(): Promise<void> {
    this.logger.log('PackInstaller: syncing compiled packs on startup...');
    try {
      const result = await this.syncAll();
      this.logger.log(
        `PackInstaller: sync complete - synced: [${result.synced.join(', ')}] ` +
        `skipped: [${result.skipped.join(', ')}] errors: [${result.errors.join(', ')}]`,
      );
    } catch (err) {
      this.logger.error(`PackInstaller: startup sync failed - ${String(err)}`);
    }

    // Phase 14 - startup health check (non-blocking)
    void this.healthCheckAll();
  }

  // -- Sync ----------------------------------------------------------------------

  async syncAll(): Promise<PackSyncResult> {
    const result: PackSyncResult = { synced: [], skipped: [], errors: [] };

    for (const entry of COMPILED_PACKS) {
      try {
        const changed = await this.registerPack(entry);
        if (changed) {
          result.synced.push(entry.dbId);
        } else {
          result.skipped.push(entry.dbId);
        }
      } catch (err) {
        this.logger.error(`PackInstaller: failed to sync ${entry.dbId} - ${String(err)}`);
        result.errors.push(entry.dbId);
      }
    }

    // Phase 1G - sync all NodeManifestV2 declarations to registered_nodes
    try {
      const nodeResult = await this.syncNodeManifests();
      this.logger.log(
        `PackInstaller: node manifests synced - upserted: ${nodeResult.upserted}` +
        (nodeResult.errors.length ? ` errors: [${nodeResult.errors.join(', ')}]` : ''),
      );
      if (nodeResult.errors.length) {
        result.errors.push(...nodeResult.errors.map((e) => `node:${e}`));
      }
    } catch (err) {
      this.logger.error(`PackInstaller: node manifest sync failed - ${String(err)}`);
      result.errors.push('node-manifest-sync');
    }

    return result;
  }

  async registerPack(entry: CompiledPackEntry): Promise<boolean> {
    const { data: existing } = await this.supabase.admin
      .from('packs')
      .select('id, version')
      .eq('id', entry.dbId)
      .maybeSingle();

    if (existing && existing['version'] === entry.version) {
      return false;
    }

    const { error } = await this.supabase.admin
      .from('packs')
      .upsert({
        id:               entry.dbId,
        display_name:     entry.displayName,
        description:      entry.description,
        author:           entry.author,
        version:          entry.version,
        previous_version: existing ? (existing['version'] as string) : null,
        icon:             entry.icon ?? null,
        color:            entry.color ?? null,
        is_official:      entry.isOfficial,
        is_enabled:       true,
        status:           'active',
        dependencies:     entry.dependencies,
        installed_from:   entry.installedFrom,
        installed_at:     existing ? undefined : new Date().toISOString(),
        updated_at:       new Date().toISOString(),
      }, { onConflict: 'id' });

    if (error) throw new Error(error.message);
    return true;
  }

  // -- Node manifest sync (Phase 1G) -----------------------------------------------

  /**
   * Upserts all NodeManifestV2 declarations from compiled packs into registered_nodes.
   * Makes code the single source of truth - eliminates per-node SQL seed migrations.
   * Safe to re-run on every startup (idempotent upsert on primary key 'type').
   * Requires all pack rows to already exist in packs table (syncAll runs first).
   */
  async syncNodeManifests(): Promise<{ upserted: number; errors: string[] }> {
    const errors: string[] = [];
    let upserted = 0;

    for (const manifest of ALL_NODE_MANIFESTS) {
      try {
        const dbPackId = MANIFEST_TO_DB_PACK_ID[manifest.packId];
        if (!dbPackId) {
          errors.push(`${manifest.type}: unknown packId '${manifest.packId}'`);
          continue;
        }

        const { error } = await this.supabase.admin
          .from('registered_nodes')
          .upsert(
            {
              type:           manifest.type,
              pack_id:        dbPackId,
              name:           manifest.name,
              description:    manifest.description,
              version:        manifest.version,
              category:       manifest.category,
              tags:           manifest.tags ?? [],
              inputs:         manifest.inputs,
              outputs:        manifest.outputs,
              config_schema:  manifest.config,
              ui_schema:      {},
              is_enabled:     true,
              icon:           (manifest as NodeManifestV2 & { icon?: string }).icon ?? null,
              uses_services:  (manifest as NodeManifestV2 & { uses_services?: string[] }).uses_services ?? [],
              data_pack_deps: (manifest as NodeManifestV2 & { data_pack_deps?: string[] }).data_pack_deps ?? [],
              color:          CATEGORY_COLOR[manifest.category] ?? '#6B7280',
              updated_at:     new Date().toISOString(),
            },
            { onConflict: 'type' },
          );

        if (error) {
          errors.push(`${manifest.type}: ${error.message}`);
        } else {
          upserted++;
        }
      } catch (err) {
        errors.push(`${manifest.type}: ${String(err)}`);
      }
    }

    return { upserted, errors };
  }

  // -- Enable / Disable ----------------------------------------------------------

  async enablePack(id: string): Promise<void> {
    const { allowed, blockedBy } = await this.registry.canEnable(id);
    if (!allowed) {
      throw new BadRequestException(
        `Cannot enable pack "${id}": the following dependencies are not active: ${blockedBy.join(', ')}`,
      );
    }

    const { error: packErr } = await this.supabase.admin
      .from('packs')
      .update({ is_enabled: true, status: 'active', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (packErr) throw new Error(packErr.message);

    await this.supabase.admin
      .from('registered_nodes')
      .update({ is_enabled: true, updated_at: new Date().toISOString() })
      .eq('pack_id', id);

    this.logger.log(`Pack enabled: ${id}`);
  }

  async disablePack(id: string): Promise<void> {
    await this.registry.findById(id);

    const { allowed, dependents } = await this.registry.canDisable(id);
    if (!allowed) {
      throw new BadRequestException(
        `Cannot disable pack "${id}": the following active packs depend on it: ${dependents.join(', ')}`,
      );
    }

    const { error: packErr } = await this.supabase.admin
      .from('packs')
      .update({ is_enabled: false, status: 'disabled', updated_at: new Date().toISOString() })
      .eq('id', id);

    if (packErr) throw new Error(packErr.message);

    await this.supabase.admin
      .from('registered_nodes')
      .update({ is_enabled: false, updated_at: new Date().toISOString() })
      .eq('pack_id', id);

    this.logger.log(`Pack disabled: ${id}`);
  }

  // -- Health check (Phase 14) ---------------------------------------------------

  /**
   * Run a startup health check for all active packs.
   * Uses prefix-matching to verify each registered node type belongs to its pack.
   * Logs broken nodes as WARN - does NOT block startup.
   */
  async healthCheckAll(): Promise<void> {
    const { data: activePacks } = await this.supabase.admin
      .from('packs')
      .select('id')
      .eq('is_enabled', true)
      .eq('status', 'active');

    for (const pack of activePacks ?? []) {
      const packId = pack['id'] as string;
      try {
        const health = await this.getPackHealthByPrefix(packId);
        if (health.status === 'healthy') {
          this.logger.log(`[HealthCheck] ${packId} - OK ${health.totalNodes} nodes healthy`);
        } else if (health.status === 'degraded') {
          this.logger.warn(
            `[HealthCheck] ${packId} - WARN ${health.brokenNodes.length}/${health.totalNodes} nodes unrecognised: ` +
            health.brokenNodes.map((n) => n.nodeType).join(', '),
          );
        } else {
          this.logger.warn(`[HealthCheck] ${packId} - ERR no registered nodes`);
        }
      } catch (err) {
        this.logger.warn(`[HealthCheck] ${packId} - error: ${String(err)}`);
      }
    }
  }

  /**
   * Prefix-based health check: a node is "resolvable" if its type starts with
   * one of the known prefixes for its pack.
   */
  async getPackHealthByPrefix(packId: string): Promise<PackHealth> {
    const nodes = await this.registry.getPackNodes(packId);
    const prefixes = PACK_PREFIXES[packId] ?? [];

    const brokenNodes = nodes
      .filter((n) => {
        const nodeType = n['type'] as string;
        if (prefixes.length === 0) return false;
        return !prefixes.some((p) => nodeType.startsWith(p));
      })
      .map((n) => ({
        nodeType:   n['type'] as string,
        resolvable: false,
        error:      'Node type prefix does not match any known resolver for this pack',
      }));

    // A pack with 0 registered nodes is not "broken" — L3 (Solution) and L5
    // (Template) official packs are bundle/composition packs by design and
    // never register their own node types (e.g. lados.solution.qs-practice,
    // lados.template.cipaa-preparation). "Broken" should mean "this pack's
    // registered nodes don't resolve", not "this pack doesn't register any
    // nodes" — those are different failure modes, and only the first one is
    // actually a health problem. Vacuously healthy: nothing registered, so
    // nothing is broken.
    let status: PackHealth['status'];
    if (nodes.length === 0) {
      status = 'healthy';
    } else if (brokenNodes.length === 0) {
      status = 'healthy';
    } else if (brokenNodes.length < nodes.length) {
      status = 'degraded';
    } else {
      status = 'broken';
    }

    return {
      packId,
      status,
      checkedAt:  new Date().toISOString(),
      totalNodes: nodes.length,
      brokenNodes,
    };
  }

  /**
   * Bulk health check for every enabled pack — Phase 21 S9.1 (429 fix,
   * 2026-07-05).
   *
   * The /packs list page used to call GET /packs/:id/health once per
   * enabled pack in parallel on mount (~21 official packs = ~21 requests,
   * doubled by React StrictMode's dev-mode double-effect). That burst,
   * plus normal nav-bar/notification polling, was enough to trip the
   * global 120 req/min-per-IP throttle (see app.module.ts PD-3 comment),
   * which then 429'd the very next page (e.g. a pack detail page) that
   * tried its own single health call right after. Fix: one bulk endpoint,
   * one request, computed server-side with no HTTP round-trips between
   * packs — same getPackHealthByPrefix() logic per pack, just not one
   * network call per pack.
   */
  async getAllPackHealth(): Promise<Record<string, PackHealth>> {
    const { data: activePacks, error } = await this.supabase.admin
      .from('packs')
      .select('id')
      .eq('is_enabled', true);

    if (error) throw new Error(error.message);

    const result: Record<string, PackHealth> = {};
    for (const pack of activePacks ?? []) {
      const packId = pack['id'] as string;
      try {
        result[packId] = await this.getPackHealthByPrefix(packId);
      } catch (err) {
        this.logger.warn(`[getAllPackHealth] ${packId} - error: ${String(err)}`);
      }
    }
    return result;
  }

  // -- Resource view registry ----------------------------------------------------

  async getResourceViews(): Promise<Record<string, PackResourceDefinition & { packId: string }>> {
    // Phase 21 S9.1 (gap closure, 2026-07-05) — the legacy prototype
    // pack path (MANIFEST_MAP) was emptied when the 10 prototype packs
    // were removed in S9, which silently deleted every resource view
    // declaration (vehicle/job/trip/driver/fuel_receipt/invoice/payment/
    // expense/payroll_run, etc.) and left the /resources page with no
    // tabs, even though the underlying resource rows were never deleted.
    // Official packs now declare the equivalent via manifest.json's
    // optional resourceViews field, persisted to packs.resource_views by
    // OfficialPackLoaderService (migration 0067). This selects both
    // sources — MANIFEST_MAP will stay permanently empty, kept only so
    // this function's shape doesn't need to change again if a compiled
    // pack path is ever reintroduced.
    const { data: activePacks } = await this.supabase.admin
      .from('packs')
      .select('id, resource_views')
      .eq('is_enabled', true)
      .eq('status', 'active');

    const activeIds = new Set((activePacks ?? []).map((p) => p['id'] as string));

    const result: Record<string, PackResourceDefinition & { packId: string }> = {};

    for (const [packId, manifest] of Object.entries(MANIFEST_MAP)) {
      if (!activeIds.has(packId)) continue;
      for (const resource of manifest.resources ?? []) {
        result[resource.type] = { ...resource, packId };
      }
    }

    for (const pack of activePacks ?? []) {
      const packId = pack['id'] as string;
      const resourceViews = (pack['resource_views'] as PackResourceDefinition[] | null) ?? [];
      for (const resource of resourceViews) {
        result[resource.type] = { ...resource, packId };
      }
    }

    return result;
  }

  async getWorkflowTemplates(packId: string): Promise<string[]> {
    const manifest = MANIFEST_MAP[packId];
    if (!manifest) return [];
    return (manifest as { workflowTemplates?: string[] }).workflowTemplates ?? [];
  }
}
