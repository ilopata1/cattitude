import { PolarCurvePoint, PolarTable } from '../models/polar.model';

/** Parse a tab-separated `.pol` matrix (TWA rows × TWS columns). */
export function parsePolarFile(text: string): PolarTable {
  const lines = text
    .split(/\r?\n/)
    .map(line => line.trim())
    .filter(Boolean);

  if (lines.length < 2) {
    throw new Error('Polar file must contain a header row and at least one data row');
  }

  const headerParts = lines[0].split(/\t+/);
  if (headerParts.length < 3 || headerParts[0].toUpperCase() !== 'TWA') {
    throw new Error('Polar file header must start with TWA followed by TWS columns');
  }

  const twsValues = headerParts.slice(1).map(parseNumber);
  const twaValues: number[] = [];
  const grid: number[][] = [];

  for (const line of lines.slice(1)) {
    const parts = line.split(/\t+/);
    if (parts.length !== headerParts.length) continue;
    twaValues.push(parseNumber(parts[0]));
    grid.push(parts.slice(1).map(parseNumber));
  }

  if (twaValues.length === 0) {
    throw new Error('Polar file contains no data rows');
  }

  return { twaValues, twsValues, grid };
}

/** Bilinear interpolation of target boat speed for arbitrary TWA/TWS. */
export function interpolateTargetSpeed(twaDeg: number, twsKnots: number, table: PolarTable): number {
  const twa = clamp(Math.abs(twaDeg), table.twaValues[0], table.twaValues[table.twaValues.length - 1]);
  const tws = clamp(twsKnots, table.twsValues[0], table.twsValues[table.twsValues.length - 1]);

  const [twaLo, twaHi, tTwa] = bracket(table.twaValues, twa);
  const [twsLo, twsHi, tTws] = bracket(table.twsValues, tws);

  const s00 = table.grid[twaLo][twsLo];
  const s01 = table.grid[twaLo][twsHi];
  const s10 = table.grid[twaHi][twsLo];
  const s11 = table.grid[twaHi][twsHi];

  const s0 = lerp(s00, s01, tTws);
  const s1 = lerp(s10, s11, tTws);
  return lerp(s0, s1, tTwa);
}

/** Target-speed curve at a fixed TWS for every TWA row in the polar table. */
export function targetCurveAtTws(twsKnots: number, table: PolarTable): PolarCurvePoint[] {
  return table.twaValues.map((twaDeg, idx) => ({
    twaDeg,
    targetKnots: interpolateColumnSpeed(twsKnots, table.twsValues, table.grid[idx]),
  }));
}

function interpolateColumnSpeed(value: number, axis: number[], row: number[]): number {
  const [lo, hi, t] = bracket(axis, value);
  return lerp(row[lo], row[hi], t);
}

function bracket(values: number[], value: number): [number, number, number] {
  if (value <= values[0]) return [0, 0, 0];
  const last = values.length - 1;
  if (value >= values[last]) return [last, last, 0];

  for (let i = 0; i < last; i++) {
    if (value >= values[i] && value <= values[i + 1]) {
      const span = values[i + 1] - values[i];
      const t = span === 0 ? 0 : (value - values[i]) / span;
      return [i, i + 1, t];
    }
  }

  return [last, last, 0];
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseNumber(raw: string): number {
  const value = Number.parseFloat(raw.trim());
  if (!Number.isFinite(value)) {
    throw new Error(`Invalid numeric value in polar file: "${raw}"`);
  }
  return value;
}
