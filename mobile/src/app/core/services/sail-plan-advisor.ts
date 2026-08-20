import {
  SailAdvice,
  SailPlan,
  SailPlanCell,
  WindBand,
  bandsFromCuts,
  cloneCell,
  emptyCell,
} from '../models/sail-plan.model';

const NEAR_TWA_DEG = 4;
const NEAR_TWS_KN = 1.5;
const LOW_POLAR_PCT = 85;

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
    return finishAdvice(cell, band, { from: plan.heavyWeather.twsFrom, to: 99 }, true, polarPct, nearHeavy(twa, twaBands, idx));
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
  const hints: string[] = [];

  const twaNear = nearEdges(twa, twaBands, ri, NEAR_TWA_DEG);
  if (twaNear.prev) {
    neighbors.push(plan.cells[ri - 1]?.[ci] ?? emptyCell());
    hints.push(`near ${twaBands[ri].from}° TWA`);
  }
  if (twaNear.next) {
    neighbors.push(plan.cells[ri + 1]?.[ci] ?? emptyCell());
    hints.push(`near ${twaBands[ri].to}° TWA`);
  }

  const twsNear = nearEdges(twsKnots, twsBands, ci, NEAR_TWS_KN);
  if (twsNear.prev) {
    neighbors.push(plan.cells[ri]?.[ci - 1] ?? emptyCell());
    hints.push(`near ${twsBands[ci].from} kn TWS`);
  }
  if (twsNear.next) {
    neighbors.push(plan.cells[ri]?.[ci + 1] ?? emptyCell());
    hints.push(`near ${twsBands[ci].to} kn TWS`);
  }

  const extraAlts = uniqueAlternatives(cell, neighbors);
  const merged: SailPlanCell = {
    ...cell,
    alternatives: extraAlts,
  };

  const nearCrossover = hints.length > 0;
  return finishAdvice(
    merged,
    twaBands[ri],
    twsBands[ci],
    false,
    polarPct,
    nearCrossover ? `Close to a cutover (${hints.join(', ')}) — alternatives may be equally valid.` : undefined,
  );
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

function nearEdges(
  value: number,
  bands: WindBand[],
  idx: number,
  threshold: number,
): { prev: boolean; next: boolean } {
  const band = bands[idx];
  if (!band) return { prev: false, next: false };
  return {
    prev: idx > 0 && Math.abs(value - band.from) <= threshold,
    next: idx < bands.length - 1 && Math.abs(value - band.to) <= threshold,
  };
}

function nearHeavy(
  twa: number,
  bands: WindBand[],
  idx: number,
): string | undefined {
  const near = nearEdges(twa, bands, idx, NEAR_TWA_DEG);
  if (near.prev || near.next) {
    return 'Close to a heavy-weather TWA cutover — confirm sea state before changing sail.';
  }
  return undefined;
}

function midpoint(band: WindBand): number {
  return (band.from + band.to) / 2;
}
