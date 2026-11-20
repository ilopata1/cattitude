import { SailAdvice } from '../models/sail-plan.model';
import { WaveEstimate } from '../waves/wave-estimator';

export type Confidence = 'high' | 'medium' | 'low' | 'none';

export type CoachSection =
  | 'sails' | 'balance' | 'performance' | 'waves' | 'downwind' | 'outlook' | 'data';

export interface CoachFinding {
  id: string;
  section: CoachSection;
  severity: 'action' | 'prepare' | 'info';
  confidence: Confidence;
  /** Plain sentence. Every number in it is also in `evidence`. */
  text: string;
  evidence: Record<string, number | string | boolean>;
  /** Phase 0 input ids this finding needed. */
  requires: string[];
  direction?: 'less-sail' | 'same' | 'none';
}

export interface Stat {
  mean: number | null;
  sd: number | null;
  slopePerMin: number | null;
  n: number;
}

export interface CoachSnapshot {
  builtAt: number;
  vessel: {
    slug: string;
    hullType: string;
    hasDaggerboards: boolean | null;
    lWlM: number | null;
    polarFile: string;
  };
  windowMin: 10 | 15 | 30 | 60;
  isNight: boolean;
  pointOfSail: 'upwind' | 'reach' | 'downwind' | null;

  wind: {
    tws: Stat;
    twa: Stat;
    twd: Stat;
    aws: Stat;
    gust10mKn: number | null;
    gustSpreadKn: number | null;
    twsTrendKnPerHour: number | null;
  };

  performance: {
    polarPct: Record<15 | 30 | 60, number | null>;
    targetKn: number | null;
    stw: Stat;
    sog: Stat;
    vmgKn: number | null;
    vmcKn: number | null;
    speedSource: 'stw' | 'sog' | null;
    /** Mean |STW − (SOG − current)|. Null when current or either speed is missing. */
    stwSogResidualKn: number | null;
    /** True when that residual is large enough, for long enough, to doubt the log. */
    sensorSuspect: boolean;
  };

  helm: {
    weatherHelmDeg: Stat | null;
    rudderSdDeg: number | null;
    headingSdDeg: number | null;
    autopilotEngaged: boolean | null;
    autopilotMode: string | null;
  };

  motion: {
    rmsPitchDeg: number | null;
    rmsRollDeg: number | null;
    rmsAccelZ: number | null;
  };

  waves: {
    estimate: WaveEstimate | null;
    ageMin: number | null;
    wavelengthM: number | null;
    phaseSpeedKn: number | null;
    lengthRatio: number | null;
    steepness: number | null;
    usable: boolean;
  };

  downwind: {
    /** Surfs in the window. Null when the one-second polar samples are absent. */
    speedExcursions: number | null;
    maxStwKn: number | null;
    maxOverTargetPct: number | null;
  };

  sails: {
    up: string;
    upChangedAt: number | null;
    advice: SailAdvice | null;
    mismatch: Record<15 | 30 | 60, boolean | null>;
    nextCutover: {
      kind: 'twa' | 'tws';
      value: number;
      distance: number;
      approaching: boolean;
    } | null;
  };

  outlook: {
    pressureHpa: number | null;
    pressureTrend3hHpa: number | null;
    nextWatchAt: number | null;
    nextWatchName: string | null;
    minutesToWatchChange: number | null;
  };

  dataHealth: { input: string; status: 'ok' | 'stale' | 'missing' }[];
}
