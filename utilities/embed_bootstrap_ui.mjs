/**
 * Merge utilities/bootstrap_ui.json into mobile bootstrap JSON.
 * Run after editing bootstrap_ui.json, or use when bootstrapping a new vessel file.
 *
 * Usage (from repo root):
 *   node utilities/embed_bootstrap_ui.mjs
 *   node utilities/embed_bootstrap_ui.mjs --slug cattitude
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const slug = process.argv.includes('--slug')
  ? process.argv[process.argv.indexOf('--slug') + 1]
  : 'cattitude';

const uiPath = path.join(repoRoot, 'utilities', 'bootstrap_ui.json');
const bootstrapPath = path.join(
  repoRoot,
  'mobile',
  'src',
  'data',
  'bootstrap',
  `${slug}.json`,
);

const ui = JSON.parse(fs.readFileSync(uiPath, 'utf8'));
const bootstrap = JSON.parse(fs.readFileSync(bootstrapPath, 'utf8'));
bootstrap.ui = ui;
fs.writeFileSync(bootstrapPath, `${JSON.stringify(bootstrap, null, 2)}\n`);

console.log(`Merged ui into ${bootstrapPath}`);
