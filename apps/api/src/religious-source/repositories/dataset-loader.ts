/**
 * Shared file-loading + caching layer for the QUL adapters. Every dataset
 * lives under `${LADOS_RELIGIOUS_DATA_PATH}/qul/` (Blueprint §7.2) as JSON
 * in v1 (Phase B) — SQLite is an approved future format (§7.1) that would
 * plug in here as a second loader without changing the repositories above it.
 *
 * Caching is process-lifetime, keyed by absolute path — datasets are
 * append-only reference data in production (re-deploy to pick up changes),
 * so this is intentionally simple rather than watching the filesystem.
 */
import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import { Logger } from '@nestjs/common';
import type { SourceManifest, AyahTextDataset, TopicDataset } from '../types';
import { verifyDatasetIntegrity, verifyAyahTextDatasetShape } from '../validators/source-integrity.validator';

const logger = new Logger('ReligiousSourceDatasetLoader');

const manifestCache = new Map<string, SourceManifest | null>();
const ayahTextCache = new Map<string, AyahTextDataset>();
const topicCache = new Map<string, TopicDataset>();

export class DatasetLoadError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'DatasetLoadError';
  }
}

export function qulRoot(dataPath: string): string {
  return join(dataPath, 'qul');
}

export async function loadManifest(dataPath: string): Promise<SourceManifest | null> {
  const manifestPath = join(qulRoot(dataPath), 'source-manifest.json');
  if (manifestCache.has(manifestPath)) {
    return manifestCache.get(manifestPath) ?? null;
  }
  try {
    const raw = await readFile(manifestPath, 'utf8');
    const parsed = JSON.parse(raw) as SourceManifest;
    manifestCache.set(manifestPath, parsed);
    return parsed;
  } catch (e: unknown) {
    logger.warn(`No/invalid source manifest at ${manifestPath}: ${e instanceof Error ? e.message : String(e)}`);
    manifestCache.set(manifestPath, null);
    return null;
  }
}

export async function loadAyahTextDataset(
  dataPath: string,
  relativeFile: string,
  declaredContentHash?: string,
): Promise<AyahTextDataset> {
  const filePath = join(qulRoot(dataPath), relativeFile);
  const cached = ayahTextCache.get(filePath);
  if (cached) return cached;

  const raw = await readFile(filePath, 'utf8');
  const integrity = verifyDatasetIntegrity(raw, declaredContentHash);
  if (!integrity.valid) {
    throw new DatasetLoadError(`${relativeFile}: ${integrity.issue}`);
  }
  const parsed: unknown = JSON.parse(raw);
  const shapeCheck = verifyAyahTextDatasetShape(parsed);
  if (!shapeCheck.valid) {
    throw new DatasetLoadError(`${relativeFile}: ${shapeCheck.issue}`);
  }
  const dataset = parsed as AyahTextDataset;
  ayahTextCache.set(filePath, dataset);
  return dataset;
}

export async function loadTopicDataset(dataPath: string, relativeFile: string): Promise<TopicDataset> {
  const filePath = join(qulRoot(dataPath), relativeFile);
  const cached = topicCache.get(filePath);
  if (cached) return cached;

  const raw = await readFile(filePath, 'utf8');
  const parsed = JSON.parse(raw) as TopicDataset;
  if (!Array.isArray(parsed)) {
    throw new DatasetLoadError(`${relativeFile}: expected an array of { theme, references[] } entries`);
  }
  topicCache.set(filePath, parsed);
  return parsed;
}

/** Test-only: clears all in-memory caches so specs can point at fresh fixtures. */
export function __clearDatasetCachesForTests(): void {
  manifestCache.clear();
  ayahTextCache.clear();
  topicCache.clear();
}
