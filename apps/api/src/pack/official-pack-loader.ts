/**
 * OfficialPackLoader — Phase 21 S1 (Official Runtime Foundation)
 *
 * Pure, DB-free loader for Phase 20B official Capability Pack skeletons
 * under `packs/official/*`. Reads each pack's manifest.json + nodes.json,
 * validates them against the @lados/pack-sdk official contract, and returns
 * a structured, typed result.
 *
 * Kept free of NestJS/Supabase so it is trivial to unit test and so it can
 * be reused by tooling (e.g. tools/validate-official-packs.cjs logic could
 * migrate onto this in a later pass). OfficialPackLoaderService wraps this
 * with the Supabase upsert side-effects.
 *
 * Per 20B2 §6 / S1 checklist: this loader "compiles" official packs into a
 * loadable shape. It does not execute any node — official skeleton nodes
 * remain non-executable until an executor is implemented for their wave.
 */
import * as fs from 'fs';
import * as path from 'path';
import {
  assertOfficialCapabilityPackManifest,
  assertOfficialNodeManifests,
  type OfficialPackSkeleton,
} from '@lados/pack-sdk';

/** Repo root, resolved relative to this file's own location (works from ts-node src/ and compiled dist/). */
export function resolveRepoRoot(): string {
  // apps/api/{src|dist}/pack -> apps/api/{src|dist} -> apps/api -> apps -> repo root
  return path.resolve(__dirname, '../../../../');
}

export interface OfficialPackLoadIssue {
  packDir: string;
  message: string;
}

export interface OfficialPackLoadResult {
  packs: OfficialPackSkeleton[];
  issues: OfficialPackLoadIssue[];
}

function readJsonFile(filePath: string): unknown {
  return JSON.parse(fs.readFileSync(filePath, 'utf8'));
}

/**
 * Loads and validates every official Capability Pack skeleton under
 * `<officialPacksDir>/*`. Invalid packs are skipped and reported in
 * `issues` rather than throwing, so one broken skeleton cannot take down
 * the whole load (matches PackInstallerService's existing per-entry
 * try/catch philosophy for prototype packs).
 */
export function loadOfficialPackSkeletons(
  officialPacksDir: string = path.join(resolveRepoRoot(), 'packs', 'official'),
): OfficialPackLoadResult {
  const issues: OfficialPackLoadIssue[] = [];
  const packs: OfficialPackSkeleton[] = [];

  if (!fs.existsSync(officialPacksDir)) {
    return { packs, issues: [{ packDir: officialPacksDir, message: 'packs/official directory does not exist' }] };
  }

  const entries = fs
    .readdirSync(officialPacksDir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => entry.name)
    .sort();

  for (const dirName of entries) {
    const packDir = path.join(officialPacksDir, dirName);
    const manifestPath = path.join(packDir, 'manifest.json');
    const nodesPath = path.join(packDir, 'nodes.json');

    if (!fs.existsSync(manifestPath) || !fs.existsSync(nodesPath)) {
      // README-only or templates-only folders (e.g. no manifest yet) are skipped silently.
      continue;
    }

    try {
      const rawManifest = readJsonFile(manifestPath);
      const manifest = assertOfficialCapabilityPackManifest(rawManifest);

      const rawNodes = readJsonFile(nodesPath);
      const nodes = assertOfficialNodeManifests(rawNodes, manifest);

      packs.push({ manifest, nodes });
    } catch (error) {
      issues.push({ packDir: dirName, message: error instanceof Error ? error.message : String(error) });
    }
  }

  return { packs, issues };
}
