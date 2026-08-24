import {
  SailAdvice,
  SailPlan,
  SailPlanCell,
  WindBand,
  bandsFromCuts,
  cloneCell,
  emptyCell,
} from '../models/sail-plan.model';

export const NEAR_TWA_ENTER_DEG = 4;
export const NEAR_TWA_EXIT_DEG = 7;
export const NEAR_TWS_ENTER_KN = 2;
export const NEAR_TWS_EXIT_KN = 4;
const LOW_POLAR_PCT = 85;

/** One TWA or TWS cutover the boat is currently near. */
export interface CrossoverEdge {
  /** Stable id for hysteresis (same physical cutover keeps the same id across bands). */
  id: string;
  hint: string;
  inEnter: boolean;
  inExit: boolean;
}

/** How close the value is to a band edge (degrees or knots). */
export interface EdgeProximity {
  toLower: number;
  toUpper: number;
  nearEnter: boolean;
  nearExit: boolean;
  hints: string[];
  edges: CrossoverEdge[];
}

export function findBandIndex(bands: WindBand[], value: number): number {
  if (bands.length === 0) return -1;
  for (let i = 0; i < bands.length; i++) {
    const last = i === bands.length - 1;
    if (last) {
      if (value >= bands[i].from && value <= bands[i].to) return i;
    } else if (value >= bands[i].from && value < bands[i].to) {
      return i;
    }
  }
  if (value < bands[0].from) return 0;
  return bands.length - 1;
}

export function resizeCells(
  oldTwaCuts: number[],
  oldTwsCuts: number[],
  oldCells: SailPlanCell[][],
  newTwaCuts: number[],
  newTwsCuts: number[],
): SailPlanCell[][] {
  const oldTwa = bandsFromCuts(oldTwaCuts);
  const oldTws = bandsFromCuts(oldTwsCuts);
  const newTwa = bandsFromCuts(newTwaCuts);
  const newTws = bandsFromCuts(newTwsCuts);

  return newTwa.map(tr =>
    newTws.map(ts => {
      const ri = findBandIndex(oldTwa, midpoint(tr));
      const ci = findBandIndex(oldTws, midpoint(ts));
      return cloneCell(oldCells[ri]?.[ci]);
    }),
  );
}

export function resizeHeavyWeatherCells(
  oldTwaCuts: number[],
  oldCells: SailPlanCell[],
  newTwaCuts: number[],
): SailPlanCell[] {
  const oldTwa = bandsFromCuts(oldTwaCuts);
  return bandsFromCuts(newTwaCuts).map(tr => {
    const ri = findBandIndex(oldTwa, midpoint(tr));
    return cloneCell(oldCells[ri]);
  });
}

export function adviseSailPlan(
  plan: SailPlan | null,
  twaDeg: number | null,
  twsKnots: number | null,
  polarPct: number | null,
): SailAdvice | null {
  if (!plan || twaDeg === null || twsKnots === null) return null;

  const twa = Math.abs(twaDeg);

  if (plan.heavyWeather?.enabled && twsKnots >= plan.heavyWeather.twsFrom) {
    const twaBands = bandsFromCuts(plan.heavyWeather.twaCuts);
    const idx = findBandIndex(twaBands, twa);
    const cell = plan.heavyWeather.cells[idx] ?? emptyCell();
    const band = twaBands[idx] ?? { from: 0, to: 180 };
    return finishAdvice(
      cell,
      band,
      { from: plan.heavyWeather.twsFrom, to: 99 },
      true,
      polarPct,
      nearHeavy(twa, twaBands, idx),
    );
  }

  const twaBands = bandsFromCuts(plan.twaCuts);
  const twsBands = bandsFromCuts(plan.twsCuts);
  if (twaBands.length === 0 || twsBands.length === 0) {
    return {
      primary: '',
      alternatives: [],
      twaBand: { from: 0, to: 180 },
      twsBand: { from: 0, to: 0 },
      heavyWeather: false,
      nearCrossover: false,
      empty: true,
    };
  }

  const ri = findBandIndex(twaBands, twa);
  const ci = findBandIndex(twsBands, twsKnots);
  const cell = plan.cells[ri]?.[ci] ?? emptyCell();

  const neighbors: SailPlanCell[] = [];
  const twaProx = edgeProximity(twa, twaBands, ri, NEAR_TWA_ENTER_DEG, NEAR_TWA_EXIT_DEG, '° TWA');
  const twsProx = edgeProximity(twsKnots, twsBands, ci, NEAR_TWS_ENTER_KN, NEAR_TWS_EXIT_KN, ' kn TWS');

  if (ri > 0 && twaProx.toLower <= NEAR_TWA_ENTER_DEG) {
    neighbors.push(plan.cells[ri - 1]?.[ci] ?? emptyCell());
  }
  if (ri < twaBands.length - 1 && twaProx.toUpper <= NEAR_TWA_ENTER_DEG) {
    neighbors.push(plan.cells[ri + 1]?.[ci] ?? emptyCell());
  }
  if (ci > 0 && twsProx.toLower <= NEAR_TWS_ENTER_KN) {
    neighbors.push(plan.cells[ri]?.[ci - 1] ?? emptyCell());
  }
  if (ci < twsBands.length - 1 && twsProx.toUpper <= NEAR_TWS_ENTER_KN) {
    neighbors.push(plan.cells[ri]?.[ci + 1] ?? emptyCell());
  }

  const hints = [...twaProx.hints, ...twsProx.hints];
  const merged: SailPlanCell = {
    ...cell,
    alternatives: uniqueAlternatives(cell, neighbors),
  };

  return finishAdvice(
    merged,
    twaBands[ri],
    twsBands[ci],
    false,
    polarPct,
    formatCrossoverHint(hints),
  );
}

export function formatCrossoverHint(hints: string[]): string | undefined {
  if (hints.length === 0) return undefined;
  return `Near a cutover (${hints.join(', ')}) — neighboring sail options may also fit.`;
}

/** Live cutover edges for sticky Polar hint text (enter vs exit independently). */
export function collectCrossoverEdges(
  plan: SailPlan,
  twaDeg: number,
  twsKnots: number,
): CrossoverEdge[] {
  const twa = Math.abs(twaDeg);
  if (plan.heavyWeather?.enabled && twsKnots >= plan.heavyWeather.twsFrom) {
    const bands = bandsFromCuts(plan.heavyWeather.twaCuts);
    const idx = findBandIndex(bands, twa);
    return edgeProximity(twa, bands, idx, NEAR_TWA_ENTER_DEG, NEAR_TWA_EXIT_DEG, '° TWA').edges;
  }
  const twaBands = bandsFromCuts(plan.twaCuts);
  const twsBands = bandsFromCuts(plan.twsCuts);
  const ri = findBandIndex(twaBands, twa);
  const ci = findBandIndex(twsBands, twsKnots);
  const twaProx = edgeProximity(twa, twaBands, ri, NEAR_TWA_ENTER_DEG, NEAR_TWA_EXIT_DEG, '° TWA');
  const twsProx = edgeProximity(twsKnots, twsBands, ci, NEAR_TWS_ENTER_KN, NEAR_TWS_EXIT_KN, ' kn TWS');
  return [...twaProx.edges, ...twsProx.edges];
}

/** Distance to band edges; used for sticky near-cutover hysteresis. */
export function edgeProximity(
  value: number,
  bands: WindBand[],
  idx: number,
  enterThreshold: number,
  exitThreshold: number,
  unitLabel: string,
): EdgeProximity {
  const band = bands[idx];
  if (!band) {
    return {
      toLower: Infinity,
      toUpper: Infinity,
      nearEnter: false,
      nearExit: false,
      hints: [],
      edges: [],
    };
  }
  const toLower = idx > 0 ? Math.abs(value - band.from) : Infinity;
  const toUpper = idx < bands.length - 1 ? Math.abs(value - band.to) : Infinity;
  const edges: CrossoverEdge[] = [];
  if (idx > 0) {
    edges.push(makeEdge(unitLabel, band.from, toLower, enterThreshold, exitThreshold));
  }
  if (idx < bands.length - 1) {
    edges.push(makeEdge(unitLabel, band.to, toUpper, enterThreshold, exitThreshold));
  }
  const hints = edges.filter(e => e.inEnter).map(e => e.hint);
  return {
    toLower,
    toUpper,
    nearEnter: hints.length > 0,
    nearExit: edges.some(e => e.inExit),
    hints,
    edges,
  };
}

function makeEdge(
  unitLabel: string,
  cut: number,
  distance: number,
  enterThreshold: number,
  exitThreshold: number,
): CrossoverEdge {
  return {
    id: `${unitLabel}|${cut}`,
    hint: `near ${cut}${unitLabel}`,
    inEnter: distance <= enterThreshold,
    inExit: distance <= exitThreshold,
  };
}

/**
 * Whether live TWA/TWS are still inside the sticky near-cutover zone for the given plan.
 * Used so the UI can keep showing a cutover hint until conditions clearly leave the seam.
 */
export function stillNearCrossoverExit(
  plan: SailPlan,
  twaDeg: number,
  twsKnots: number,
): boolean {
  return collectCrossoverEdges(plan, twaDeg, twsKnots).some(e => e.inExit);
}

export function adviceBandKey(advice: SailAdvice): string {
  return [
    advice.heavyWeather ? 'h' : 'n',
    advice.twaBand.from,
    advice.twaBand.to,
    advice.twsBand.from,
    advice.twsBand.to,
    advice.primary,
  ].join('|');
}

function finishAdvice(
  cell: SailPlanCell,
  twaBand: WindBand,
  twsBand: WindBand,
  heavyWeather: boolean,
  polarPct: number | null,
  crossoverHint?: string,
): SailAdvice {
  const empty = !cell.primary.trim() && cell.alternatives.every(a => !a.trim());
  let performanceHint: string | undefined;
  if (polarPct !== null && polarPct < LOW_POLAR_PCT) {
    performanceHint = `At ${polarPct.toFixed(0)}% of polar — consider an alternative sail or a hotter angle.`;
  }
  return {
    primary: cell.primary.trim(),
    alternatives: cell.alternatives.map(a => a.trim()).filter(Boolean),
    notes: cell.notes?.trim() || undefined,
    avoid: cell.avoid?.trim() || undefined,
    twaBand,
    twsBand,
    heavyWeather,
    nearCrossover: !!crossoverHint,
    crossoverHint,
    performanceHint,
    empty,
  };
}

function uniqueAlternatives(current: SailPlanCell, neighbors: SailPlanCell[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (text: string | undefined) => {
    const t = (text ?? '').trim();
    if (!t) return;
    const key = t.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(t);
  };

  current.alternatives.forEach(add);
  const primaryKey = current.primary.trim().toLowerCase();
  for (const n of neighbors) {
    if (n.primary.trim().toLowerCase() !== primaryKey) add(n.primary);
    n.alternatives.forEach(add);
  }
  return out.filter(a => a.toLowerCase() !== primaryKey);
}

function nearHeavy(
  twa: number,
  bands: WindBand[],
  idx: number,
): string | undefined {
  const prox = edgeProximity(twa, bands, idx, NEAR_TWA_ENTER_DEG, NEAR_TWA_EXIT_DEG, '° TWA');
  if (prox.nearEnter) {
    return 'Near a heavy-weather TWA cutover — confirm sea state before changing sail.';
  }
  return undefined;
}

function midpoint(band: WindBand): number {
  return (band.from + band.to) / 2;
}
