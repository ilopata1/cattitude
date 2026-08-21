export interface PolarTable {
  /** True-wind-angle rows in degrees (typically 50–150). */
  twaValues: number[];
  /** True-wind-speed columns in knots (typically 6–28). */
  twsValues: number[];
  /** Target boat speed [twaIdx][twsIdx] in knots. */
  grid: number[][];
}

export interface PolarSample {
  timestamp: number;
  stwKnots: number;
  twsKnots: number;
  twaDeg: number;
  targetKnots: number;
  polarPct: number;
}

/** Which Signal-K boat-speed path is driving polar %. */
export type PolarBoatSpeedSource = 'stw' | 'sog';

export interface PolarLiveState {
  /** Boat speed used for polar % (STW when available, else SOG). */
  stwKnots: number | null;
  /** Which path produced {@link stwKnots}. */
  boatSpeedSource: PolarBoatSpeedSource | null;
  twsKnots: number | null;
  twaDeg: number | null;
  targetKnots: number | null;
  instantPolarPct: number | null;
  lastUpdate: number | null;
  stale: boolean;
}

export type PolarWindowMinutes = 5 | 10 | 15;

export interface PolarCurvePoint {
  twaDeg: number;
  targetKnots: number;
}
