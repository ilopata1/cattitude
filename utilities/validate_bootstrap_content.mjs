/**
 * Validate mobile bootstrap JSON structure and cross-references.
 *
 * Usage (from repo root):
 *   node utilities/validate_bootstrap_content.mjs
 *   node utilities/validate_bootstrap_content.mjs --slug cattitude
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv.includes('--slug')
  ? process.argv[process.argv.indexOf('--slug') + 1]
  : 'cattitude';

const bootstrapPath = path.join(
  repoRoot,
  'mobile',
  'src',
  'data',
  'bootstrap',
  `${slug}.json`,
);

const errors = [];

function fail(message) {
  errors.push(message);
}

const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));

for (const key of [
  'vesselSlug',
  'branding',
  'emergency',
  'systems',
  'checklists',
  'fixes',
  'locations',
  'manualTitles',
  'ui',
]) {
  if (!(key in bootstrap)) {
    fail(`Missing top-level key: ${key}`);
  }
}

const ui = bootstrap.ui;
if (ui) {
  for (const key of [
    'homeRuleSections',
    'doMenu',
    'checklistMeta',
    'systemOrder',
    'locationLayout',
  ]) {
    if (!(key in ui)) {
      fail(`Missing ui.${key}`);
    }
  }

  if (Array.isArray(ui.systemOrder)) {
    for (const systemId of ui.systemOrder) {
      if (!bootstrap.systems?.[systemId]) {
        fail(`ui.systemOrder references unknown system: ${systemId}`);
      }
    }
  }

  if (Array.isArray(ui.doMenu)) {
    for (const section of ui.doMenu) {
      for (const item of section.items ?? []) {
        if (item.progressType === 'checklist' && item.key !== 'learn') {
          if (!bootstrap.checklists?.[item.key]) {
            fail(`doMenu item "${item.key}" has no matching checklist`);
          }
          if (!ui.checklistMeta?.[item.key]) {
            fail(`doMenu checklist "${item.key}" missing checklistMeta entry`);
          }
        }
      }
    }
  }

  if (Array.isArray(ui.locationLayout)) {
    for (const zone of ui.locationLayout) {
      if (!bootstrap.locations?.[zone.id]) {
        fail(`ui.locationLayout references unknown location: ${zone.id}`);
      }
    }
  }
}

if (bootstrap.branding?.headerLogo) {
  const logoPath = path.join(
    repoRoot,
    'mobile',
    'src',
    bootstrap.branding.headerLogo.replace(/^assets\//, 'assets/'),
  );
  if (!fs.existsSync(logoPath)) {
    fail(`Missing branding.headerLogo file: ${bootstrap.branding.headerLogo}`);
  }
}

if (errors.length) {
  console.error(`Bootstrap validation failed (${errors.length} issue(s)):`);
  for (const message of errors) {
    console.error(`  - ${message}`);
  }
  process.exit(1);
}

console.log(`Bootstrap OK: ${bootstrapPath}`);
