/**
 * LEGACY: one-time migration from app/index.html → bootstrap JSON.
 *
 * Production content lives in mobile/src/data/bootstrap/cattitude.json.
 * Edit that file directly (or utilities/bootstrap_ui.json + embed_bootstrap_ui.mjs
 * for the ui section). Do not use this script for routine content updates.
 *
 * Usage (from repo root):
 *   node utilities/extract_bootstrap_content.mjs
 */

import fs from 'fs';
import path from 'path';
import { createHash } from 'crypto';
import { fileURLToPath } from 'url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const htmlPath = path.join(repoRoot, 'app', 'index.html');
const outDir = path.join(repoRoot, 'mobile', 'src', 'data', 'bootstrap');
const assetsDir = path.join(repoRoot, 'mobile', 'src', 'assets', 'images');

const html = fs.readFileSync(htmlPath, 'utf8');
const scriptMatch = html.match(/<script>\s*([\s\S]*?)<\/script>/);
if (!scriptMatch) {
  throw new Error('Could not find <script> block in app/index.html');
}
const script = scriptMatch[1];

function extractConst(name) {
  const marker = `const ${name} =`;
  const start = script.indexOf(marker);
  if (start === -1) {
    throw new Error(`Could not find ${marker}`);
  }
  let i = script.indexOf('=', start) + 1;
  while (script[i] === ' ') i += 1;

  const open = script[i];
  const close = open === '{' ? '}' : open === '[' ? ']' : null;
  if (!close) {
    throw new Error(`Unexpected value for const ${name}`);
  }

  let depth = 0;
  let j = i;
  let inString = false;
  let stringChar = '';

  for (; j < script.length; j += 1) {
    const c = script[j];
    if (inString) {
      if (c === '\\') {
        j += 1;
        continue;
      }
      if (c === stringChar) {
        inString = false;
      }
      continue;
    }
    if (c === '"' || c === "'" || c === '`') {
      inString = true;
      stringChar = c;
      continue;
    }
    if (c === open) depth += 1;
    if (c === close) {
      depth -= 1;
      if (depth === 0) {
        j += 1;
        break;
      }
    }
  }

  const expr = script.slice(i, j);
  // eslint-disable-next-line no-eval
  return eval(`(${expr})`);
}

function extractDataUriFromHtml(idHint) {
  const re = new RegExp(
    `<img[^>]+src="(data:image\\/[^"]+)"[^>]*alt="${idHint}"`,
    'i',
  );
  const match = html.match(re);
  return match ? match[1] : null;
}

const imageIndex = new Map();

function saveDataUri(dataUri, prefix) {
  const existing = imageIndex.get(dataUri);
  if (existing) {
    return existing;
  }

  const match = dataUri.match(/^data:image\/([\w+]+);base64,(.+)$/s);
  if (!match) {
    throw new Error(`Invalid data URI prefix for ${prefix}`);
  }

  const ext = match[1] === 'jpeg' ? 'jpg' : match[1];
  const bytes = Buffer.from(match[2], 'base64');
  const hash = createHash('sha256').update(bytes).digest('hex').slice(0, 12);
  const filename = `${prefix}-${hash}.${ext}`;
  const relPath = `assets/images/vessels/cattitude/systems/${filename}`;
  const absPath = path.join(assetsDir, 'systems', filename);

  fs.mkdirSync(path.dirname(absPath), { recursive: true });
  fs.writeFileSync(absPath, bytes);
  imageIndex.set(dataUri, relPath);
  return relPath;
}

/** Parse data URIs of any length without regex backtracking limits. */
function findNextDataUri(str, fromIndex = 0) {
  const start = str.indexOf('data:image/', fromIndex);
  if (start === -1) {
    return null;
  }

  const semi = str.indexOf(';base64,', start);
  if (semi === -1) {
    return null;
  }

  let end = semi + ';base64,'.length;
  while (end < str.length) {
    const c = str[end];
    if (
      (c >= 'A' && c <= 'Z') ||
      (c >= 'a' && c <= 'z') ||
      (c >= '0' && c <= '9') ||
      c === '+' ||
      c === '/' ||
      c === '='
    ) {
      end += 1;
    } else {
      break;
    }
  }

  return { uri: str.slice(start, end), start, end };
}

function replaceDataUrisInString(value, prefix = 'img') {
  let result = value;
  let searchFrom = 0;
  let counter = 0;

  while (true) {
    const found = findNextDataUri(result, searchFrom);
    if (!found) {
      break;
    }

    const assetPath = saveDataUri(found.uri, `${prefix}-${counter}`);
    counter += 1;
    result =
      result.slice(0, found.start) + assetPath + result.slice(found.end);
    searchFrom = found.start + assetPath.length;
  }

  return result;
}

function replaceDataUris(value, prefix = 'img') {
  if (typeof value === 'string') {
    if (value.includes('data:image/')) {
      return replaceDataUrisInString(value, prefix);
    }
    if (value.startsWith('data:image/')) {
      return saveDataUri(value, prefix);
    }
    return value;
  }
  if (Array.isArray(value)) {
    return value.map((item, idx) => replaceDataUris(item, `${prefix}-${idx}`));
  }
  if (value && typeof value === 'object') {
    const out = {};
    for (const [key, nested] of Object.entries(value)) {
      out[key] = replaceDataUris(nested, `${prefix}-${key}`);
    }
    return out;
  }
  return value;
}

const SYS = extractConst('SYS');
const CL = extractConst('CL');
const FIX = extractConst('FIX');
const LOCS = extractConst('LOCS');
const MANUAL_TITLES = extractConst('MANUAL_TITLES');

const headerLogoUri =
  html.match(/class="header-logo"[\s\S]*?src="(data:image\/[^"]+)"/)?.[1] ??
  null;
const heroLogoUri =
  html.match(/class="hero-title"[\s\S]*?src="(data:image\/[^"]+)"/)?.[1] ??
  null;

const branding = {
  vesselName: 'Cattitude',
  vesselSlug: 'cattitude',
  vesselType: 'sailing_catamaran',
  model: 'Fountaine Pajot Tanna 47',
  charterCompany: 'Cruise Abaco',
  location: 'Marsh Harbour, Abacos',
  marina: 'Boat Harbour Marina',
  tagline: 'Fountaine Pajot Tanna 47 · Charter Guide',
  headerLogo: headerLogoUri ? saveDataUri(headerLogoUri, 'logo-header') : null,
  heroLogo: heroLogoUri ? saveDataUri(heroLogoUri, 'logo-hero') : null,
};

const emergency = {
  mayday: {
    channel: 'VHF Ch 16',
    vesselCallsign: 'Cattitude',
    steps: [
      'Tune VHF to Channel 16 — switch to high power (25W)',
      'Say "MAYDAY MAYDAY MAYDAY"',
      'Say "This is Cattitude, Cattitude, Cattitude"',
      'Say "MAYDAY Cattitude"',
      'State your position — GPS lat/long or bearing and distance from known landmark',
      'State nature of distress — fire, sinking, medical, etc.',
      'State assistance required',
      'State number of persons on board',
      'Release transmit button and listen for response',
    ],
  },
  contacts: [
    {
      label: 'Cruise Abaco — Jesse',
      detail: 'Dockmaster 24/7',
      value: '+1 305-304-5821',
      tel: '+13053045821',
      action: 'call',
    },
    {
      label: 'Cruise Abaco VHF',
      detail: 'Office hours approx 9am–5pm',
      value: 'Ch 09',
      action: 'vhf',
    },
    {
      label: 'Boat Harbour Marina VHF',
      detail: 'Working channel',
      value: 'Ch 68',
      action: 'vhf',
    },
  ],
  modalSubtitle: 'Cattitude · Cruise Abaco · Marsh Harbour, Bahamas',
};

const bootstrap = replaceDataUris(
  {
    vesselId: null,
    vesselSlug: branding.vesselSlug,
    branding,
    emergency,
    systems: SYS,
    checklists: CL,
    fixes: FIX,
    locations: LOCS,
    manualTitles: MANUAL_TITLES,
  },
  'asset',
);

const outJsonPath = path.join(outDir, 'cattitude.json');
if (fs.existsSync(outJsonPath)) {
  try {
    const existing = JSON.parse(fs.readFileSync(outJsonPath, 'utf8'));
    if (existing.ui) {
      bootstrap.ui = existing.ui;
      console.log('Preserved existing ui section from cattitude.json');
    }
  } catch {
    console.warn('Could not read existing cattitude.json — ui section not preserved');
  }
}

fs.mkdirSync(outDir, { recursive: true });
let json = JSON.stringify(bootstrap, null, 2);
if (json.includes('data:image/')) {
  json = replaceDataUrisInString(json, 'asset-straggler');
}
fs.writeFileSync(path.join(outDir, 'cattitude.json'), json);

console.log(`Wrote ${path.join(outDir, 'cattitude.json')}`);
console.log(`Extracted ${imageIndex.size} images to ${path.join(assetsDir, 'systems')}`);
