/**
 * Derived coaching numbers. Each one stays null when an input it needs is missing.
 * Thresholds live in coach-settings.ts.
 */

import { sampleSd, slopePerMinute, unwrapDegrees, circularSdDeg } from '../ab-test/ab-test';
import { POLAR_SAMPLE_INTERVAL_MS } from '../services/polar-window';
import {
  NEAR_TWA_ENTER_DEG,
  NEAR_TWA_EXIT_DEG,
  NEAR_TWS_ENTER_KN,
  NEAR_TWS_EXIT_KN,
  collectCrossoverEdges,
  edgeProximity,
  findBandIndex,
} from '../services/sail-plan-advisor';
import { SailPlan, bandsFromCuts } from '../models/sail-plan.model';
import {
  COACH_NIGHT_ELEVATION_MAX_DEG,
  COACH_POLAR_HISTORY_MIN,
  HELM_HEADING_CHANGE_DEG,
  HELM_SETTLE_MS,
  HELM_STEADY_TWA_SD_DEG,
  STW_RESIDUAL_FRACTION,
  STW_RESIDUAL_KN,
  SURF_MIN_S,
  SURF_OVER_TARGET_PCT,
} from './coach-settings';

export interface HelmBiasSample {
  twaDeg: number | null;
  weatherHelmDeg: number | null;
}

export interface WorkloadSample {
  at: number;
  headingDeg: number | null;
  rudderDeg: number | null;
}

export interface SurfSample {
  at: number;
  stwKn: number;
  targetKn: number;
}

export interface TrackSample {
  stwKn: number;
  headingDeg: number;
  sogKn: number;
  cogDeg: number;
}

export interface CurrentDrift {
  setDeg: number | null;
  driftKn: number | null;
}

export interface CutoverEdge {
  kind: 'twa' | 'tws';
  value: number;
  distance: number;
  approaching: boolean;
}

/** Mean weather helm, or null when the window's true wind angle is not steady. */
export function helmBiasDeg(
  samples: HelmBiasSample[],
  steadySdDeg = HELM_STEADY_TWA_SD_DEG,
): number | null {
  const twa = finite(samples.map(sample => sample.twaDeg));
  if (twa.length < 2 || !(sampleSd(twa) < steadySdDeg)) return null;
  const helm = finite(samples.map(sample => sample.weatherHelmDeg));
  if (!helm.length) return null;
  return helm.reduce((sum, value) => sum + value, 0) / helm.length;
}

/**
 * Rudder and heading spread, with the settle after a tack or gybe left out.
 * The settle length is the A/B test's settle.
 */
export function helmWorkload(samples: WorkloadSample[]): { rudderSdDeg: number | null; headingSdDeg: number | null } {
  const ordered = samples.slice().sort((a, b) => a.at - b.at);
  const changes: number[] = [];
  let previous: number | null = null;
  for (const sample of ordered) {
    if (sample.headingDeg == null || !Number.isFinite(sample.headingDeg)) continue;
    if (previous != null && headingChangeDeg(previous, sample.headingDeg) > HELM_HEADING_CHANGE_DEG) {
      changes.push(sample.at);
    }
    previous = sample.headingDeg;
  }
  const settled = ordered.filter(sample => !changes.some(change =>
    sample.at >= change && sample.at < change + HELM_SETTLE_MS));
  const rudder = finite(settled.map(sample => sample.rudderDeg));
  const heading = finite(settled.map(sample => sample.headingDeg));
  return {
    rudderSdDeg: rudder.length >= 2 ? sampleSd(rudder) : null,
    headingSdDeg: heading.length >= 2 ? circularSdDeg(heading) : null,
  };
}

/**
 * How many times speed through water stayed more than the surf margin above
 * the polar target. Null when the window is longer than the polar history.
 */
export function speedExcursions(samples: SurfSample[], windowMin: number, nowMs: number): number | null {
  if (windowMin > COACH_POLAR_HISTORY_MIN) return null;
  const start = nowMs - windowMin * 60_000;
  const ordered = samples
    .filter(sample => sample.at >= start && sample.at <= nowMs)
    .filter(sample => Number.isFinite(sample.stwKn) && Number.isFinite(sample.targetKn) && sample.targetKn > 0)
    .slice()
    .sort((a, b) => a.at - b.at);
  let count = 0;
  let runStart: number | null = null;
  let runEnd: number | null = null;
  let previousAt: number | null = null;
  const close = () => {
    if (runStart != null && runEnd != null && runEnd - runStart >= SURF_MIN_S * 1000) count += 1;
    runStart = null;
    runEnd = null;
  };
  for (const sample of ordered) {
    const above = sample.stwKn > sample.targetKn * (1 + SURF_OVER_TARGET_PCT / 100);
    const gap = previousAt != null && sample.at - previousAt > POLAR_SAMPLE_INTERVAL_MS;
    if (!above || gap) close();
    if (above) {
      if (runStart == null) runStart = sample.at;
      runEnd = sample.at;
    }
    previousAt = sample.at;
  }
  close();
  return count;
}

/** Mean size of STW minus (SOG minus the current). Null without a set and a drift. */
export function stwResidualKn(samples: TrackSample[], current: CurrentDrift | null): number | null {
  if (!current || current.setDeg == null || current.driftKn == null) return null;
  if (!Number.isFinite(current.setDeg) || !Number.isFinite(current.driftKn)) return null;
  const residuals: number[] = [];
  const currentNorth = current.driftKn * Math.cos(toRad(current.setDeg));
  const currentEast = current.driftKn * Math.sin(toRad(current.setDeg));
  for (const sample of samples) {
    if (!Number.isFinite(sample.stwKn) || !Number.isFinite(sample.headingDeg)) continue;
    if (!Number.isFinite(sample.sogKn) || !Number.isFinite(sample.cogDeg)) continue;
    const stwNorth = sample.stwKn * Math.cos(toRad(sample.headingDeg));
    const stwEast = sample.stwKn * Math.sin(toRad(sample.headingDeg));
    const groundNorth = sample.sogKn * Math.cos(toRad(sample.cogDeg)) - currentNorth;
    const groundEast = sample.sogKn * Math.sin(toRad(sample.cogDeg)) - currentEast;
    residuals.push(Math.hypot(stwNorth - groundNorth, stwEast - groundEast));
  }
  if (!residuals.length) return null;
  return residuals.reduce((sum, value) => sum + value, 0) / residuals.length;
}

/** Both gates have to hold for the window mean. A single spike does not qualify. */
export function stwSensorSuspect(residualKn: number | null, stwKn: number | null): boolean {
  if (residualKn == null || stwKn == null || !(stwKn > 0)) return false;
  return residualKn > STW_RESIDUAL_KN && residualKn > stwKn * STW_RESIDUAL_FRACTION;
}

/** Least-squares true-wind trend, knots per hour, over the times given. */
export function twsTrendKnPerHour(timesMs: number[], twsKn: number[]): number | null {
  const slope = slopePerMinute(timesMs, twsKn);
  return slope == null ? null : slope * 60;
}

/** The logbook's three-hour pressure change, unchanged. */
export function pressureTrendHpa(trend: number | null | undefined): number | null {
  return trend == null || !Number.isFinite(trend) ? null : trend;
}

/**
 * Nearest sail-plan cutover. `approaching` follows the 30-minute slope
 * toward that edge. Slopes are knots or degrees per minute.
 */
export function nextCutover(
  plan: SailPlan | null,
  twaDeg: number | null,
  twsKn: number | null,
  twaSlopePerMin: number | null,
  twsSlopePerMin: number | null,
): CutoverEdge | null {
  if (!plan || twaDeg == null || twsKn == null) return null;
  if (!Number.isFinite(twaDeg) || !Number.isFinite(twsKn)) return null;
  const twa = Math.abs(twaDeg);
  const live = new Set(collectCrossoverEdges(plan, twa, twsKn).map(edge => edge.id));
  const candidates = cutoverDistances(plan, twa, twsKn).filter(edge => live.has(edge.id) && Number.isFinite(edge.distance));
  if (!candidates.length) return null;
  candidates.sort((a, b) => a.distance - b.distance);
  const nearest = candidates[0];
  const here = nearest.kind === 'tws' ? twsKn : twa;
  const slope = nearest.kind === 'tws' ? twsSlopePerMin : twaSlopePerMin;
  const toward = nearest.value > here ? 1 : nearest.value < here ? -1 : 0;
  const approaching = slope != null && toward !== 0 && Math.sign(slope) === toward;
  return { kind: nearest.kind, value: nearest.value, distance: nearest.distance, approaching };
}

/** Degrees above the horizon. The NOAA solar approximation, with no extra library. */
export function solarElevationDeg(latDeg: number, lonDeg: number, utcMs: number): number {
  const date = new Date(utcMs);
  const yearStart = Date.UTC(date.getUTCFullYear(), 0, 0);
  const day = (utcMs - yearStart) / 86_400_000;
  const gamma = (2 * Math.PI / 365) * (day - 1);
  const decl = 0.006918
    - 0.399912 * Math.cos(gamma)
    + 0.070257 * Math.sin(gamma)
    - 0.006758 * Math.cos(2 * gamma)
    + 0.000907 * Math.sin(2 * gamma)
    - 0.002697 * Math.cos(3 * gamma)
    + 0.00148 * Math.sin(3 * gamma);
  const eqTime = 229.18 * (
    0.000075
    + 0.001868 * Math.cos(gamma)
    - 0.032077 * Math.sin(gamma)
    - 0.014615 * Math.cos(2 * gamma)
    - 0.040849 * Math.sin(2 * gamma)
  );
  const minutes = date.getUTCHours() * 60
    + date.getUTCMinutes()
    + date.getUTCSeconds() / 60
    + date.getUTCMilliseconds() / 60_000;
  const ha = (minutes + eqTime + 4 * lonDeg) / 4 - 180;
  const lat = latDeg * Math.PI / 180;
  const haRad = ha * Math.PI / 180;
  const cosZenith = Math.sin(lat) * Math.sin(decl) + Math.cos(lat) * Math.cos(decl) * Math.cos(haRad);
  const clamped = Math.min(1, Math.max(-1, cosZenith));
  return 90 - Math.acos(clamped) * 180 / Math.PI;
}

/** Night only when a position lets the sun angle be computed, and it is below the line. */
export function isNightAt(position: { lat: number; lon: number } | null, utcMs: number): boolean {
  if (!position) return false;
  return solarElevationDeg(position.lat, position.lon, utcMs) < COACH_NIGHT_ELEVATION_MAX_DEG;
}

function cutoverDistances(
  plan: SailPlan,
  twa: number,
  twsKn: number,
): { id: string; kind: 'twa' | 'tws'; value: number; distance: number }[] {
  if (plan.heavyWeather?.enabled && twsKn >= plan.heavyWeather.twsFrom) {
    return bandEdges(plan.heavyWeather.twaCuts, twa, 'twa');
  }
  return [
    ...bandEdges(plan.twaCuts, twa, 'twa'),
    ...bandEdges(plan.twsCuts, twsKn, 'tws'),
  ];
}

function bandEdges(
  cuts: number[],
  value: number,
  kind: 'twa' | 'tws',
): { id: string; kind: 'twa' | 'tws'; value: number; distance: number }[] {
  const bands = bandsFromCuts(cuts);
  const idx = findBandIndex(bands, value);
  const label = kind === 'twa' ? '° TWA' : ' kn TWS';
  const prox = edgeProximity(
    value,
    bands,
    idx,
    kind === 'twa' ? NEAR_TWA_ENTER_DEG : NEAR_TWS_ENTER_KN,
    kind === 'twa' ? NEAR_TWA_EXIT_DEG : NEAR_TWS_EXIT_KN,
    label,
  );
  const band = bands[idx];
  if (!band) return [];
  const edges: { id: string; kind: 'twa' | 'tws'; value: number; distance: number }[] = [];
  if (idx > 0) edges.push({ id: `${label}|${band.from}`, kind, value: band.from, distance: prox.toLower });
  if (idx < bands.length - 1) edges.push({ id: `${label}|${band.to}`, kind, value: band.to, distance: prox.toUpper });
  return edges;
}

function headingChangeDeg(from: number, to: number): number {
  const unwrapped = unwrapDegrees([from, to]);
  return Math.abs(unwrapped[1] - unwrapped[0]);
}

function finite(values: Array<number | null | undefined>): number[] {
  return values.filter((value): value is number => value != null && Number.isFinite(value));
}

function toRad(deg: number): number {
  return deg * Math.PI / 180;
}
