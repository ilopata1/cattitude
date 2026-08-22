import { InstrumentRole } from './instrument-map.model';

export interface InstrumentRoleConfig {
  role: InstrumentRole;
  label: string;
  hint: string;
  /** Match against path with self. prefix stripped. */
  pattern: RegExp;
}

/** Roles surfaced on the Instruments settings screen (Sail tab essentials). */
export const INSTRUMENT_ROLE_CONFIG: InstrumentRoleConfig[] = [
  {
    role: 'depth',
    label: 'Depth',
    hint: 'Metres — below transducer or surface',
    pattern: /^environment\.depth\./,
  },
  {
    role: 'speed',
    label: 'Boat speed (STW)',
    hint: 'Metres per second on the wire; shown as knots on Sail',
    pattern: /^navigation\.speed(ThroughWater)?$/,
  },
  {
    role: 'heading',
    label: 'Heading',
    hint: 'True heading for the wind-steer rose',
    pattern: /^navigation\.heading(True|Magnetic)?$/,
  },
  {
    role: 'cog',
    label: 'Course over ground',
    hint: 'True COG for the wind-steer rose',
    pattern: /^navigation\.courseOverGround(True|Magnetic)?$/,
  },
  {
    role: 'awa',
    label: 'Apparent wind angle',
    hint: 'Degrees relative to bow',
    pattern: /^environment\.wind\.angleApparent$/,
  },
  {
    role: 'aws',
    label: 'Apparent wind speed',
    hint: 'Metres per second',
    pattern: /^environment\.wind\.speedApparent$/,
  },
  {
    role: 'twa',
    label: 'True wind angle',
    hint: 'Degrees relative to bow (water-referenced)',
    pattern: /^environment\.wind\.angleTrue(Water|Ground)?$/,
  },
  {
    role: 'tws',
    label: 'True wind speed',
    hint: 'Metres per second',
    pattern: /^environment\.wind\.speedTrue$/,
  },
];

export const SPEED_FALLBACK_ROLE = 'sog' as const;

export function stripSelfPrefix(path: string): string {
  return path.replace(/^self\./, '').replace(/^vessels\.[^.]+\./, '');
}

export function candidatesForRole(
  role: InstrumentRole,
  discovered: Map<string, { path: string; value: number }>,
  currentPath?: string,
): string[] {
  const cfg = INSTRUMENT_ROLE_CONFIG.find(r => r.role === role);
  if (!cfg) return currentPath ? [currentPath] : [];

  const matches: string[] = [];
  for (const entry of discovered.values()) {
    const rel = stripSelfPrefix(entry.path);
    if (cfg.pattern.test(rel)) matches.push(entry.path);
  }
  if (currentPath && !matches.includes(currentPath)) matches.unshift(currentPath);
  matches.sort((a, b) => stripSelfPrefix(a).localeCompare(stripSelfPrefix(b)));
  return matches;
}

export function sogCandidates(
  discovered: Map<string, { path: string; value: number }>,
  currentPath?: string,
): string[] {
  const matches: string[] = [];
  for (const entry of discovered.values()) {
    const rel = stripSelfPrefix(entry.path);
    if (/^navigation\.speedOverGround$/.test(rel)) matches.push(entry.path);
  }
  if (currentPath && !matches.includes(currentPath)) matches.unshift(currentPath);
  return matches;
}
