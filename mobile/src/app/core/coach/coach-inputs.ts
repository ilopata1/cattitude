/**
 * Coach data health. Reports whether each briefing input is present, how old
 * the latest sample is, and how fast samples are arriving.
 *
 * A missing input stays missing. Apparent wind is not copied into true wind,
 * magnetic heading is not copied into true heading, and a Signal K current
 * path is not treated as the logbook's set and drift.
 */

import { combinedRudderDeg } from '../ab-test/ab-test';
import { stripVessel } from '../logbook/logbook-ingest';
import { attitudeParts } from '../waves/wave-attitude';
import { COACH_ARRIVAL_CAP, COACH_RATE_WINDOW_MS } from './coach-settings';

export const COACH_INPUT_ORDER = [
  'tws',
  'twa',
  'twd',
  'aws',
  'awa',
  'stw',
  'sog',
  'heading',
  'cog',
  'rudder',
  'rateOfTurn',
  'attitude',
  'accelZ',
  'autopilot',
  'current',
  'pressure',
  'sails',
] as const;

export type CoachInputId = typeof COACH_INPUT_ORDER[number];

export const COACH_INPUT_LABELS: Record<CoachInputId, string> = {
  tws: 'True wind speed',
  twa: 'True wind angle',
  twd: 'True wind direction',
  aws: 'Apparent wind speed',
  awa: 'Apparent wind angle',
  stw: 'Speed through water',
  sog: 'Speed over ground',
  heading: 'Heading',
  cog: 'Course over ground',
  rudder: 'Rudder',
  rateOfTurn: 'Rate of turn',
  attitude: 'Attitude',
  accelZ: 'Vertical acceleration',
  autopilot: 'Autopilot',
  current: 'Current',
  pressure: 'Pressure',
  sails: 'Sails up',
};

export type CoachInputStatus = 'ok' | 'stale' | 'missing';

export interface CoachInputSeries {
  input: string;
  arrivals: number[];
  /** Null means a present value does not expire (the sails the crew entered). */
  staleAfterMs: number | null;
  rateWindowMs?: number;
  /** The value is known, but nobody recorded when it last changed. */
  presentWithoutTime?: boolean;
}

export interface CoachInputHealth {
  input: string;
  status: CoachInputStatus;
  ageMs: number | null;
  /** Samples per minute inside the rate window. Null with fewer than two. */
  ratePerMin: number | null;
  samples: number;
}

export interface CoachLedger {
  arrivals: Partial<Record<CoachInputId, number[]>>;
}

export interface CoachDelta {
  updates?: {
    timestamp?: string;
    values?: { path: string; value: unknown }[];
  }[];
}

export interface LogbookCurrentSample {
  setDeg: number | null;
  driftKn: number | null;
  setAtMs: number | null;
  driftAtMs: number | null;
}

export interface LogbookCurrentEntry {
  atMs: number;
  setDeg: number | null;
  driftKn: number | null;
}

export interface DatedFact {
  atMs: number;
  source: 'live' | 'entry';
}

const NUMERIC_PATHS: Record<string, CoachInputId> = {
  'environment.wind.speedTrue': 'tws',
  'environment.wind.angleTrueWater': 'twa',
  'environment.wind.angleTrueGround': 'twa',
  'environment.wind.directionTrue': 'twd',
  'environment.wind.speedApparent': 'aws',
  'environment.wind.angleApparent': 'awa',
  'navigation.speedThroughWater': 'stw',
  'navigation.speedOverGround': 'sog',
  'navigation.headingTrue': 'heading',
  'navigation.courseOverGroundTrue': 'cog',
  'navigation.rateOfTurn': 'rateOfTurn',
  'environment.outside.pressure': 'pressure',
};

const RUDDER_PATHS = new Set([
  'steering.rudderAngle',
  'steering.rudderAngle.port',
  'steering.rudderAngle.starboard',
]);

export function emptyCoachLedger(): CoachLedger {
  return { arrivals: {} };
}

export function assessCoachInputs(series: CoachInputSeries[], nowMs: number): CoachInputHealth[] {
  return series.map(item => assessOne(item, nowMs));
}

/**
 * Live pressure wins when it has been seen, including when it has since gone
 * stale. The logbook value is used only when the live path was never seen.
 */
export function preferCoachHealth(
  primary: CoachInputHealth,
  fallback: CoachInputHealth,
): CoachInputHealth {
  if (primary.status === 'missing') return { ...fallback, input: primary.input };
  return primary;
}

/**
 * Set and drift together. The live logbook reading wins. An older log entry
 * is used only when the live pair is absent. One of the two numbers is not enough.
 */
export function logbookCurrentFact(
  live: LogbookCurrentSample | null,
  entriesNewestFirst: LogbookCurrentEntry[],
): DatedFact | null {
  if (
    live
    && live.setDeg != null
    && live.driftKn != null
    && live.setAtMs != null
    && live.driftAtMs != null
  ) {
    return { atMs: Math.min(live.setAtMs, live.driftAtMs), source: 'live' };
  }
  for (const entry of entriesNewestFirst) {
    if (entry.setDeg != null && entry.driftKn != null && Number.isFinite(entry.atMs)) {
      return { atMs: entry.atMs, source: 'entry' };
    }
  }
  return null;
}

export function logbookPressureArrivalMs(
  entriesNewestFirst: { atMs: number; pressureHpa: number | null }[],
): number | null {
  for (const entry of entriesNewestFirst) {
    if (entry.pressureHpa != null && Number.isFinite(entry.atMs)) return entry.atMs;
  }
  return null;
}

export function recordCoachDelta(
  ledger: CoachLedger,
  delta: CoachDelta,
  receivedAtMs: number,
): CoachLedger {
  let arrivals = ledger.arrivals;
  for (const update of delta.updates ?? []) {
    const at = updateTime(update.timestamp, receivedAtMs);
    const touched = new Set<CoachInputId>();
    let primary: number | null = null;
    let port: number | null = null;
    let starboard: number | null = null;
    let rudderSeen = false;
    let attitude = false;
    for (const entry of update.values ?? []) {
      const key = stripVessel(entry.path);
      const numericId = NUMERIC_PATHS[key];
      if (numericId && finiteNumber(entry.value) != null) touched.add(numericId);
      if (RUDDER_PATHS.has(key)) {
        rudderSeen = true;
        const rad = finiteNumber(entry.value);
        if (key === 'steering.rudderAngle') primary = rad;
        if (key === 'steering.rudderAngle.port') port = rad;
        if (key === 'steering.rudderAngle.starboard') starboard = rad;
      }
      if (key === 'navigation.attitude' && attitudeParts(entry.value)) attitude = true;
      if (
        (key === 'navigation.attitude.pitch' || key === 'navigation.attitude.roll')
        && finiteNumber(entry.value) != null
      ) {
        attitude = true;
      }
      if (key === 'navigation.attitude.accelZ' && finiteNumber(entry.value) != null) {
        touched.add('accelZ');
      }
      if (key === 'steering.autopilot.state' && autopilotStatePresent(entry.value)) {
        touched.add('autopilot');
      }
      if (
        key.startsWith('notifications.')
        && /autopilot|pilot/i.test(key)
        && entry.value != null
        && typeof entry.value === 'object'
      ) {
        touched.add('autopilot');
      }
    }
    if (rudderSeen && combinedRudderDeg(primary, port, starboard) != null) touched.add('rudder');
    if (attitude) touched.add('attitude');
    for (const id of touched) {
      const next = appendArrival(arrivals[id], at);
      if (next === arrivals[id]) continue;
      if (arrivals === ledger.arrivals) arrivals = { ...arrivals };
      arrivals[id] = next;
    }
  }
  return arrivals === ledger.arrivals ? ledger : { arrivals };
}

export function formatCoachInputLine(row: CoachInputHealth): string {
  const label = COACH_INPUT_LABELS[row.input as CoachInputId] ?? row.input;
  if (row.status === 'missing') return `${label} — Missing`;
  const state = row.status === 'ok' ? 'OK' : 'Stale';
  const age = row.ageMs == null ? 'age not recorded' : formatAge(row.ageMs);
  const rate = row.ratePerMin == null ? '' : ` · ${formatRate(row.ratePerMin)}`;
  return `${label} — ${state} · ${age}${rate}`;
}

function assessOne(item: CoachInputSeries, nowMs: number): CoachInputHealth {
  const arrivals = cleanArrivals(item.arrivals, nowMs);
  if (arrivals.length === 0) {
    if (item.presentWithoutTime) {
      return { input: item.input, status: 'ok', ageMs: null, ratePerMin: null, samples: 1 };
    }
    return { input: item.input, status: 'missing', ageMs: null, ratePerMin: null, samples: 0 };
  }
  const latest = arrivals[arrivals.length - 1];
  const ageMs = nowMs - latest;
  const status: CoachInputStatus = item.staleAfterMs == null || ageMs <= item.staleAfterMs
    ? 'ok'
    : 'stale';
  const windowMs = item.rateWindowMs ?? COACH_RATE_WINDOW_MS;
  const inWindow = arrivals.filter(at => at >= nowMs - windowMs);
  let ratePerMin: number | null = null;
  if (inWindow.length >= 2) {
    const spanMin = (inWindow[inWindow.length - 1] - inWindow[0]) / 60_000;
    if (spanMin > 0) ratePerMin = (inWindow.length - 1) / spanMin;
  }
  return { input: item.input, status, ageMs, ratePerMin, samples: arrivals.length };
}

function cleanArrivals(arrivals: number[], nowMs: number): number[] {
  const unique = new Set<number>();
  for (const at of arrivals) {
    if (typeof at === 'number' && Number.isFinite(at) && at <= nowMs) unique.add(at);
  }
  return [...unique].sort((a, b) => a - b);
}

function appendArrival(existing: number[] | undefined, at: number): number[] {
  if (!Number.isFinite(at)) return existing ?? [];
  const prev = existing ?? [];
  if (prev.includes(at)) return prev;
  const next = [...prev, at].sort((a, b) => a - b);
  if (next.length > COACH_ARRIVAL_CAP) return next.slice(next.length - COACH_ARRIVAL_CAP);
  return next;
}

function updateTime(timestamp: string | undefined, receivedAtMs: number): number {
  if (timestamp) {
    const parsed = Date.parse(timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return receivedAtMs;
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function autopilotStatePresent(value: unknown): boolean {
  if (typeof value === 'string') return value.trim().length > 0;
  if (!value || typeof value !== 'object') return false;
  const record = value as Record<string, unknown>;
  const state = record['state'] ?? record['mode'];
  return typeof state === 'string' && state.trim().length > 0;
}

function formatAge(ms: number): string {
  const sec = Math.max(0, Math.round(ms / 1000));
  if (sec < 90) return `${sec} s ago`;
  const min = Math.round(sec / 60);
  if (min < 90) return `${min} min ago`;
  const hours = Math.round((min / 60) * 10) / 10;
  return `${hours} h ago`;
}

function formatRate(perMin: number): string {
  if (perMin >= 10) return `${Math.round(perMin)}/min`;
  const rounded = Math.round(perMin * 10) / 10;
  return `${rounded}/min`;
}
