/** Inclusive lower bound, exclusive upper bound except the last band which is inclusive of `to`. */
export interface WindBand {
  from: number;
  to: number;
}

export interface SailPlanCell {
  /** Default recommendation for this TWA × TWS band (free text, e.g. "Main + jib"). */
  primary: string;
  /** Other valid combinations when the call is close. */
  alternatives: string[];
  /** Optional seamanship note for this cell. */
  notes?: string;
  /** Combinations to avoid in this band. */
  avoid?: string;
}

export interface HeavyWeatherPlan {
  enabled: boolean;
  /** TWS at or above which this overlay replaces the main grid. */
  twsFrom: number;
  twaCuts: number[];
  cells: SailPlanCell[];
}

export interface SailPlan {
  name: string;
  /** Inventory of sails this vessel actually carries. */
  sails: string[];
  /** Sorted TWA cutovers in degrees, including start and end (typically 0 … 180). */
  twaCuts: number[];
  /** Sorted TWS cutovers in knots, including start and end of the last normal column. */
  twsCuts: number[];
  /** cells[twaBandIndex][twsBandIndex] */
  cells: SailPlanCell[][];
  heavyWeather: HeavyWeatherPlan;
  notes?: string;
}

export interface SailAdvice {
  primary: string;
  alternatives: string[];
  notes?: string;
  avoid?: string;
  twaBand: WindBand;
  twsBand: WindBand;
  heavyWeather: boolean;
  nearCrossover: boolean;
  crossoverHint?: string;
  performanceHint?: string;
  empty: boolean;
}

export function emptyCell(): SailPlanCell {
  return { primary: '', alternatives: [] };
}

export function cloneCell(cell: SailPlanCell | undefined): SailPlanCell {
  if (!cell) return emptyCell();
  return {
    primary: cell.primary,
    alternatives: [...(cell.alternatives ?? [])],
    notes: cell.notes,
    avoid: cell.avoid,
  };
}

export function bandsFromCuts(cuts: number[]): WindBand[] {
  const sorted = [...cuts].filter(n => Number.isFinite(n)).sort((a, b) => a - b);
  const bands: WindBand[] = [];
  for (let i = 0; i < sorted.length - 1; i++) {
    if (sorted[i + 1] > sorted[i]) {
      bands.push({ from: sorted[i], to: sorted[i + 1] });
    }
  }
  return bands;
}

export function formatBand(band: WindBand, unit: string): string {
  return `${band.from}–${band.to} ${unit}`;
}
