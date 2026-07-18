#!/usr/bin/env node
/**
 * ONE-OFF exporter: RAFIQ's QUL topics/themes SQLite datasets ->
 * QMCP's TopicDataset JSON shape ({ theme, references: [{surah, ayahStart,
 * ayahEnd?}] }[]) consumed by apps/api/src/religious-source/repositories/
 * topic.repository.ts.
 *
 * This script contains no Islamic content itself — only the transform
 * logic — so it is safe to commit. Its OUTPUT (topics.json / themes.json)
 * is real QUL-sourced content and must never be committed; it is written
 * under the gitignored --out directory only. See
 * scripts/stage-qmcp-local-religious-source.mjs for the companion script
 * that stages translations/tafsir/quran script and writes the manifest
 * that references these two files.
 *
 * Requires Node 22+ (uses the still-experimental node:sqlite module).
 * This is the only script in the religious-source staging pair with that
 * requirement — everything else targets the repo's Node >=20 floor.
 *
 * Usage (from repo root):
 *   node scripts/export-qul-topics-sqlite.mjs [--rafiq-data <path>] [--out <path>]
 *
 * Defaults: --rafiq-data ../../00 RAFIQ/data   --out local-data/religious-source
 */
import { writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(__dirname, '..');

function parseArgs(argv) {
  const args = {
    rafiqData: path.resolve(repoRoot, '..', '..', '00 RAFIQ', 'data'),
    out: path.resolve(repoRoot, 'local-data', 'religious-source'),
  };
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === '--rafiq-data') args.rafiqData = path.resolve(argv[++i]);
    if (argv[i] === '--out') args.out = path.resolve(argv[++i]);
  }
  return args;
}

function parseAyahList(ayahs) {
  // "1:1, 1:2, 1:6, ..." -> [{surah, ayahStart}]
  return ayahs
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean)
    .map((pair) => {
      const [surah, ayah] = pair.split(':').map((n) => Number.parseInt(n, 10));
      return { surah, ayahStart: ayah };
    })
    .filter((r) => Number.isFinite(r.surah) && Number.isFinite(r.ayahStart));
}

async function main() {
  const { rafiqData, out } = parseArgs(process.argv.slice(2));

  let DatabaseSync;
  try {
    ({ DatabaseSync } = await import('node:sqlite'));
  } catch {
    console.error(
      'node:sqlite is not available in this Node runtime (needs Node 22+). ' +
        'This exporter is optional — the main staging script (stage-qmcp-local-religious-source.mjs) ' +
        'runs fine without topics/themes; find_quran_candidates will just return NO_QURAN_CANDIDATES_FOUND ' +
        'until this has been run once on a Node 22+ machine.',
    );
    process.exit(1);
  }

  const qulOut = path.join(out, 'qul');
  await mkdir(qulOut, { recursive: true });

  const topicsDbPath = path.join(rafiqData, 'raw/tafsir/topics.db');
  const topicsDb = new DatabaseSync(topicsDbPath);
  const topicRows = topicsDb.prepare('select name, ayahs from topics').all();
  const topics = topicRows
    .map((row) => ({ theme: String(row.name), references: parseAyahList(String(row.ayahs ?? '')) }))
    .filter((t) => t.references.length > 0);
  await writeFile(path.join(qulOut, 'topics.json'), JSON.stringify(topics), 'utf8');
  console.log(`wrote topics.json (${topics.length} topics, from ${topicsDbPath})`);

  const themesDbPath = path.join(rafiqData, 'raw/tafsir/ayah-themes.db');
  const themesDb = new DatabaseSync(themesDbPath);
  const themeRows = themesDb.prepare('select theme, surah_number, ayah_from, ayah_to from themes').all();
  const themes = themeRows.map((row) => ({
    theme: String(row.theme),
    references: [
      {
        surah: row.surah_number,
        ayahStart: row.ayah_from,
        ...(row.ayah_to && row.ayah_to !== row.ayah_from ? { ayahEnd: row.ayah_to } : {}),
      },
    ],
  }));
  await writeFile(path.join(qulOut, 'themes.json'), JSON.stringify(themes), 'utf8');
  console.log(`wrote themes.json (${themes.length} themes, from ${themesDbPath})`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
