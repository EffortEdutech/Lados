#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const repoRoot = path.resolve(__dirname, '..');
const officialRoot = path.join(repoRoot, 'packs', 'official');
const sdkPath = path.join(repoRoot, 'packages', '@lados', 'pack-sdk', 'dist');

function fail(message) {
  console.error(`Official pack validation failed: ${message}`);
  process.exit(1);
}

function readJson(filePath) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch (error) {
    fail(`${path.relative(repoRoot, filePath)} is not valid JSON: ${error.message}`);
  }
}

function getOfficialPackDirs() {
  if (!fs.existsSync(officialRoot)) {
    fail('packs/official does not exist');
  }

  return fs.readdirSync(officialRoot)
    .map((entry) => path.join(officialRoot, entry))
    .filter((entryPath) => fs.statSync(entryPath).isDirectory());
}

function requireSdk() {
  try {
    return require(sdkPath);
  } catch (error) {
    fail(`@lados/pack-sdk dist is not built. Run "corepack pnpm --filter @lados/pack-sdk build" first. ${error.message}`);
  }
}

function addUnique(map, key, owner, label, issues) {
  if (!key) return;
  const existing = map.get(key);
  if (existing) {
    issues.push(`${label} "${key}" is declared by both ${existing} and ${owner}`);
    return;
  }
  map.set(key, owner);
}

function main() {
  const sdk = requireSdk();
  const packDirs = getOfficialPackDirs();
  const issues = [];
  const capabilityOwners = new Map();
  const nodeOwners = new Map();
  const nodeManifestsByType = new Map();
  const packs = [];

  for (const packDir of packDirs) {
    const manifestPath = path.join(packDir, 'manifest.json');
    const nodesPath = path.join(packDir, 'nodes.json');
    const relativePackDir = path.relative(repoRoot, packDir);

    if (!fs.existsSync(manifestPath)) {
      issues.push(`${relativePackDir} is missing manifest.json`);
      continue;
    }
    if (!fs.existsSync(nodesPath)) {
      issues.push(`${relativePackDir} is missing nodes.json`);
      continue;
    }

    const rawManifest = readJson(manifestPath);
    const rawNodes = readJson(nodesPath);

    const packResult = sdk.validateOfficialCapabilityPackManifest(rawManifest);
    if (!packResult.valid) {
      for (const issue of packResult.issues) {
        issues.push(`${relativePackDir}/manifest.json ${issue.field}: ${issue.message}`);
      }
      continue;
    }

    const manifest = sdk.assertOfficialCapabilityPackManifest(rawManifest);
    const nodeResult = sdk.validateOfficialNodeManifests(rawNodes, manifest);
    if (!nodeResult.valid) {
      for (const issue of nodeResult.issues) {
        issues.push(`${relativePackDir}/nodes.json ${issue.field}: ${issue.message}`);
      }
      continue;
    }

    const nodes = sdk.assertOfficialNodeManifests(rawNodes, manifest);
    packs.push({ manifest, nodes, packDir: relativePackDir });

    for (const capability of manifest.capabilities) {
      addUnique(capabilityOwners, capability, manifest.id, 'Canonical capability', issues);
    }

    for (const node of nodes) {
      addUnique(nodeOwners, node.type, manifest.id, 'Official node type', issues);
      nodeManifestsByType.set(node.type, node);
    }
  }

  for (const alias of sdk.officialCompatibilityAliases ?? []) {
    const target = nodeManifestsByType.get(alias.officialType);
    if (!target) {
      issues.push(`Compatibility alias ${alias.prototypeType} points to missing official node ${alias.officialType}`);
      continue;
    }

    if (target.ownerPack !== alias.officialPack) {
      issues.push(
        `Compatibility alias ${alias.prototypeType} expected pack ${alias.officialPack}, but target ${alias.officialType} belongs to ${target.ownerPack}`,
      );
    }

    if (target.canonicalCapability !== alias.canonicalCapability) {
      issues.push(
        `Compatibility alias ${alias.prototypeType} expected capability ${alias.canonicalCapability}, but target ${alias.officialType} declares ${target.canonicalCapability}`,
      );
    }
  }

  if (issues.length > 0) {
    for (const issue of issues) {
      console.error(`- ${issue}`);
    }
    fail(`${issues.length} issue(s) found`);
  }

  const nodeCount = packs.reduce((sum, pack) => sum + pack.nodes.length, 0);
  const aliasCount = sdk.officialCompatibilityAliases?.length ?? 0;

  console.log('Official pack validation passed.');
  console.log(`Packs: ${packs.length}`);
  console.log(`Nodes: ${nodeCount}`);
  console.log(`Canonical capabilities: ${capabilityOwners.size}`);
  console.log(`Compatibility aliases: ${aliasCount}`);
}

main();
