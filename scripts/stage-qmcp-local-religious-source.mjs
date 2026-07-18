#!/usr/bin/env node
/**
 * DEV/TEST-ONLY staging script — QMCP local religious-source dataset.
 *
 * Copies + normalizes a subset of RAFIQ's already-downloaded, checksummed
 * QUL/Tanzil raw datasets (C:\Users\...\00 RAFIQ\data\raw) into the flat
 * `{ "surah:ayah": "text" }` shape QMCP's ReligiousSourceService expects
 * (apps/api/src/religious-source/repositories/dataset-loader.ts's
 * verifyAyahTextDatasetShape — RAFIQ's real QUL exports are ayah-keyed but
 * one level more nested, e.g. `{"1:1":{"t":"..."}}` for translations and
 * `{"1:1":{"text":"<p>...</p>"}}` for tafsir/quran script), and writes a
 * source-manifest.json in the SourceManifest shape
 * (apps/api/src/religious-source/types.ts) pointing at the normalized
 * files, so LADOS_RELIGIOUS_DATA_PATH can point straight at --out.
 *
 * THIS IS AN INTERIM, LOCAL-ONLY SOURCE, not a production dataset pick.
 * It exists so QMCP's Phase B/C nodes can be exercised against real
 * Quran/translation/tafsir text (instead of only the tiny placeholder
 * fixtures under apps/api/test/fixtures/qul/) without needing network
 * access, while Blueprint §7.3's dataset selection is still open. Per eff
 * (2026-07-19): once RAFIQ's content pipeline is stable enough to produce
 * "Dakwah PKA" packages, QMCP's dataset source should be migrated to
 * consume that instead of this staging path — swapping is a manifest/config
 * change only (translationId/tafsirIds resolution already treats the
 * source-manifest as swappable, see Volume 2 §4.2.3), not a rebuild.
 *
 * Known limitations (see the flagged manifest entries in the output):
 *  - The Malay translation (QUL id 292, "Abdullah Basamia") is recorded by
 *    RAFIQ's own audit (00 RAFIQ/data/manifests/qul-translation-malay-292.json)
 *    as status "raw_validated_rights_and_attribution_blocked" — no
 *    copyright info supplied by QUL, and NOT confirmed identical to the
 *    well-known "Abdullah Basmeih" translation (2,092 differing records vs
 *    Tanzil's ms.basmeih). DEV/TEST ONLY — do not ship content grounded in
 *    this translation until that is resolved.
 *  - No Malay or Indonesian tafsir is staged (RAFIQ has not acquired those
 *    yet) — only Arabic (As-Saadi) and English (Ibn Kathir, Al-Mukhtasar)
 *    tafsir are available locally. secondaryTranslation is English (Sahih
 *    International) rather than Indonesian for the same reason.
 *  - topics.json / themes.json are only included if
 *    scripts/export-qul-topics-sqlite.mjs has already been run against the
 *    same --out directory (that script needs Node 22+; this one does not).
 *
 * Usage (from repo root):
 *   node scripts/export-qul-topics-sqlite.mjs [--rafiq-data <path>] [--out <path>]   # optional, Node 22+
 *   node scripts/stage-qmcp-local-religious-source.mjs [--rafiq-data <path>] [--out <path>]
 *   # then add to apps/api/.env (never commit): LADOS_RELIGIOUS_DATA_PATH=<absolute --out path>
 *
 * Defaults: --rafiq-data ../../00 RAFIQ/data   --out local-data/religious-source
 */
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { createHash } from 'node:crypto';
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

function stripHtml(html) {
  return html
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

function sha256(content) {
  return createHash('sha256').update(content, 'utf8').digest('hex');
}

async function loadJson(p) {
  return JSON.parse(await readFile(p, 'utf8'));
}

async function fileExists(p) {
  try {
    await access(p);
    return true;
  } catch {
    return false;
  }
}

/** Unwraps RAFIQ's real QUL nested export ({"1:1":{field:"..."}}) into the
 * flat { "surah:ayah": "string" } shape verifyAyahTextDatasetShape requires. */
function unwrapField(rawObj, field, transform) {
  const out = {};
  for (const [key, val] of Object.entries(rawObj)) {
    const text = val && typeof val === 'object' ? val[field] : undefined;
    if (typeof text === 'string' && text.trim().length > 0) {
      out[key] = transform ? transform(text) : text;
    }
  }
  return out;
}

async function main() {
  const { rafiqData, out } = parseArgs(process.argv.slice(2));
  console.log('RAFIQ data source:', rafiqData);
  console.log('Output (LOCAL, gitignored, DEV/TEST ONLY — never commit):', out);

  const qulOut = path.join(out, 'qul');
  await mkdir(qulOut, { recursive: true });

  const sources = [
    { in: 'raw/quran/qul/uthmani.json', outFile: 'quran-uthmani.json', field: 'text', html: false },
    { in: 'raw/translations/qul/abdullah-basamia-simple.json', outFile: 'translation-ms-basamia.json', field: 't', html: false },
    { in: 'raw/translations/qul/en-sahih-international-simple.json', outFile: 'translation-en-sahih.json', field: 't', html: false },
    { in: 'raw/tafsir/ar-tafseer-al-saddi.json', outFile: 'tafsir-ar-saadi.json', field: 'text', html: true },
    { in: 'raw/tafsir/en-tafisr-ibn-kathir.json', outFile: 'tafsir-en-ibnkathir.json', field: 'text', html: true },
    { in: 'raw/tafsir/en-tafisr-Al-Mukhtasar.json', outFile: 'tafsir-en-mukhtasar.json', field: 'text', html: true },
  ];

  const hashes = {};
  for (const s of sources) {
    const inPath = path.join(rafiqData, s.in);
    const raw = await loadJson(inPath);
    const flat = unwrapField(raw, s.field, s.html ? stripHtml : undefined);
    const count = Object.keys(flat).length;
    if (count === 0) {
      throw new Error(`${s.in}: normalized to 0 ayah entries — source shape may have changed, check field "${s.field}"`);
    }
    const content = JSON.stringify(flat);
    await writeFile(path.join(qulOut, s.outFile), content, 'utf8');
    hashes[s.outFile] = sha256(content);
    console.log(`  wrote ${s.outFile} (${count} ayah entries)`);
  }

  let topicsEntry;
  let themesEntry;
  if (await fileExists(path.join(qulOut, 'topics.json'))) {
    const raw = await readFile(path.join(qulOut, 'topics.json'), 'utf8');
    topicsEntry = { id: 'qul-topics-sqlite-export', file: 'topics.json', sourceUrl: 'https://qul.tarteel.ai/resources' };
    console.log(`  found existing topics.json (${JSON.parse(raw).length} topics) — referencing in manifest`);
  } else {
    console.warn('  no topics.json found — run scripts/export-qul-topics-sqlite.mjs first (Node 22+) if you want topic search to work');
  }
  if (await fileExists(path.join(qulOut, 'themes.json'))) {
    const raw = await readFile(path.join(qulOut, 'themes.json'), 'utf8');
    themesEntry = { id: 'qul-ayah-themes-sqlite-export', file: 'themes.json', sourceUrl: 'https://qul.tarteel.ai/resources' };
    console.log(`  found existing themes.json (${JSON.parse(raw).length} themes) — referencing in manifest`);
  }

  const manifest = {
    _comment:
      'DEV/TEST-ONLY LOCAL DATASET — staged from 00 RAFIQ/data/raw by scripts/stage-qmcp-local-religious-source.mjs. ' +
      'Not a production dataset selection (Blueprint V1.0 §7.3 is still open). See that script for full provenance notes.',
    quranScript: {
      id: 'qul-uthmani-88',
      resourceName: 'QUL Uthmani Quran Script',
      language: 'ar',
      file: 'quran-uthmani.json',
      sourceUrl: 'https://qul.tarteel.ai/resources/quran-script',
      contentHash: hashes['quran-uthmani.json'],
    },
    translations: [
      {
        id: 'qul-translation-malay-292',
        resourceName:
          'DEV/TEST ONLY — QUL "Abdullah Basamia" Malay Translation (rights/attribution UNRESOLVED per RAFIQ audit — do not use in production)',
        language: 'ms',
        file: 'translation-ms-basamia.json',
        role: 'primary',
        sourceUrl: 'https://qul.tarteel.ai/resources/translation/292',
        licenseReference:
          'UNRESOLVED — RAFIQ data/manifests/qul-translation-malay-292.json: "No copyright information supplied by QUL"; status raw_validated_rights_and_attribution_blocked',
        contentHash: hashes['translation-ms-basamia.json'],
      },
      {
        id: 'qul-translation-saheeh-193',
        resourceName: 'QUL Saheeh International English Translation',
        language: 'en',
        file: 'translation-en-sahih.json',
        role: 'secondary',
        sourceUrl: 'https://qul.tarteel.ai/resources/translation/193',
        contentHash: hashes['translation-en-sahih.json'],
      },
    ],
    tafsirs: [
      {
        id: 'qul-tafsir-arabic-saadi-308',
        resourceName: 'QUL Tafsir As-Saadi (Arabic)',
        language: 'ar',
        file: 'tafsir-ar-saadi.json',
        role: 'primary',
        sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/308',
        contentHash: hashes['tafsir-ar-saadi.json'],
      },
      {
        id: 'qul-tafsir-english-ibn-kathir-35',
        resourceName: 'QUL Tafsir Ibn Kathir (English)',
        language: 'en',
        file: 'tafsir-en-ibnkathir.json',
        role: 'secondary',
        sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/35',
        contentHash: hashes['tafsir-en-ibnkathir.json'],
      },
      {
        id: 'qul-tafsir-english-mukhtasar-266',
        resourceName: 'QUL Tafsir Al-Mukhtasar (English)',
        language: 'en',
        file: 'tafsir-en-mukhtasar.json',
        role: 'secondary',
        sourceUrl: 'https://qul.tarteel.ai/resources/tafsir/266',
        contentHash: hashes['tafsir-en-mukhtasar.json'],
      },
    ],
    ...(topicsEntry ? { topics: topicsEntry } : {}),
    ...(themesEntry ? { themes: themesEntry } : {}),
  };

  await writeFile(path.join(qulOut, 'source-manifest.json'), JSON.stringify(manifest, null, 2), 'utf8');
  console.log('  wrote source-manifest.json');
  console.log('\nNext step — add to apps/api/.env (never commit):');
  console.log(`  LADOS_RELIGIOUS_DATA_PATH=${out}`);
  console.log(
    '\nDEV/TEST ONLY. Do not ship dakwah content grounded in the Malay translation until RAFIQ resolves its rights/attribution status.',
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
