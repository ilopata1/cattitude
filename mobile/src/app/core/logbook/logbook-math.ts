import {
  LiveReading,
  LogIntervalHours,
  LogTrigger,
  Passage,
  PropulsionState,
  TrackSample,
} from '../models/logbook.model';

const METRES_PER_NM = 1852;
const MPS_TO_KNOTS = 1.943844;
const RAD_TO_DEG = 180 / Math.PI;

export const ANCHOR_PAUSE_MS = 15 * 60 * 1000;
export const STALE_AFTER_MS = 60_000;
export const POSITION_JITTER_M = 5;

const BEAUFORT_MAX_KN = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];

export function haversineNm(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return (km * 1000) / METRES_PER_NM;
}

/** Initial great-circle bearing, degrees true 0–360. */
export function bearingDeg(
  a: { lat: number; lon: number },
  b: { lat: number; lon: number },
): number {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x =
    Math.cos(lat1) * Math.sin(lat2) -
    Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return wrap360((Math.atan2(y, x) * 180) / Math.PI);
}

export function formatPosition(lat: number, lon: number): string {
  const ns = lat >= 0 ? 'N' : 'S';
  const ew = lon >= 0 ? 'E' : 'W';
  return `${formatHemisphere(Math.abs(lat), ns, 2)}  ${formatHemisphere(Math.abs(lon), ew, 3)}`;
}

export function beaufortFromKnots(knots: number | null): number | null {
  if (knots == null || !Number.isFinite(knots) || knots < 0) return null;
  for (let force = 0; force < BEAUFORT_MAX_KN.length; force++) {
    if (knots < BEAUFORT_MAX_KN[force]) return force;
  }
  return 12;
}

export function knotsFromMps(mps: number): number {
  return mps * MPS_TO_KNOTS;
}

/**
 * Signal K angles are radians. Values above one full circle are degrees,
 * matching the rest of the instrument pages.
 */
export function angleToDegrees(value: number): number {
  const deg = Math.abs(value) <= Math.PI * 2 + 0.01 ? value * RAD_TO_DEG : value;
  return wrap360(deg);
}

export function signedAngleToDegrees(value: number): number {
  const deg = Math.abs(value) <= Math.PI * 2 + 0.01 ? value * RAD_TO_DEG : value;
  return wrapSigned180(deg);
}

export function pressureHpa(value: number): number | null {
  if (!Number.isFinite(value) || value <= 0) return null;
  const hpa = value > 2000 ? value / 100 : value;
  if (hpa < 800 || hpa > 1100) return null;
  return Math.round(hpa * 10) / 10;
}

/** Signal K temperatures are kelvin. A value already in a human range is left as Celsius. */
export function temperatureC(value: number): number | null {
  if (!Number.isFinite(value)) return null;
  const c = value > 150 ? value - 273.15 : value;
  if (c < -80 || c > 80) return null;
  return Math.round(c * 10) / 10;
}

/**
 * Signal K `revolutions` is hertz. A value too high to be hertz for a marine
 * engine is already RPM.
 */
export function rpmFromRevolutions(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const rpm = value <= 120 ? value * 60 : value;
  return Math.round(rpm);
}

export function engineRunning(state: string | null, rpm: number | null): boolean {
  if ((state || '').toLowerCase() === 'started') return true;
  return rpm != null && rpm >= 300;
}

export function ratioOrPercent(value: number): number | null {
  if (!Number.isFinite(value) || value < 0) return null;
  const ratio = value > 1 ? value / 100 : value;
  if (ratio > 1.5) return null;
  return Math.round(ratio * 1000) / 1000;
}

export function derivePropulsion(input: {
  navState: string | null;
  enginesRunning: boolean;
  sailsUp: boolean;
  sogKn: number | null;
}): PropulsionState {
  const nav = (input.navState || '').toLowerCase();
  if (nav === 'anchored' || nav === 'moored') return 'anchored';
  if (input.enginesRunning && input.sailsUp) return 'motor-sailing';
  if (input.enginesRunning) return 'motoring';
  if (input.sailsUp) return 'sailing';
  if ((input.sogKn ?? 0) < 0.4) return 'stopped';
  return 'sailing';
}

export function sailsUp(main: string, headsail: string): boolean {
  return !!(main.trim() || headsail.trim());
}

export function readingUsable(reading: LiveReading): boolean {
  return reading.position != null
    || reading.sogKn != null
    || reading.twsKn != null
    || reading.headingTrueDeg != null;
}

export function coreStaleFields(reading: LiveReading, nowMs: number): string[] {
  const fields: Array<[string, number | string | null]> = [
    ['position', reading.position ? reading.positionAt : null],
    ['heading', reading.headingTrueDeg],
    ['sog', reading.sogKn],
    ['tws', reading.twsKn],
    ['pressure', reading.pressureHpa],
  ];
  const stale: string[] = [];
  for (const [name, value] of fields) {
    if (value == null) {
      stale.push(name);
      continue;
    }
    const seen = reading.seen[name] ?? 0;
    if (nowMs - seen > STALE_AFTER_MS) stale.push(name);
  }
  return stale;
}

/** Most recent interval boundary at or before `nowMs`, aligned to UTC midnight plus offset. */
export function latestSlotMs(
  nowMs: number,
  intervalHours: LogIntervalHours,
  offsetMinutes: number,
): number {
  const intervalMs = intervalHours * 3_600_000;
  const offsetMs = clampOffset(offsetMinutes) * 60_000;
  const day = new Date(nowMs);
  const utcMidnight = Date.UTC(day.getUTCFullYear(), day.getUTCMonth(), day.getUTCDate());
  const origin = utcMidnight + offsetMs;
  if (nowMs < origin) {
    const yesterday = origin - 86_400_000;
    const steps = Math.floor((nowMs - yesterday) / intervalMs);
    return yesterday + steps * intervalMs;
  }
  const steps = Math.floor((nowMs - origin) / intervalMs);
  return origin + steps * intervalMs;
}

export function intervalDue(
  nowMs: number,
  lastIntervalAtMs: number,
  intervalHours: LogIntervalHours,
  offsetMinutes: number,
): boolean {
  const slot = latestSlotMs(nowMs, intervalHours, offsetMinutes);
  return nowMs >= slot && lastIntervalAtMs < slot;
}

export function nextSlotMs(
  nowMs: number,
  lastIntervalAtMs: number,
  intervalHours: LogIntervalHours,
  offsetMinutes: number,
): number {
  const latest = latestSlotMs(nowMs, intervalHours, offsetMinutes);
  if (lastIntervalAtMs < latest) return latest;
  return latest + intervalHours * 3_600_000;
}

export function anchoringPauseActive(
  state: PropulsionState,
  stateSinceMs: number,
  nowMs: number,
  enabled: boolean,
): boolean {
  if (!enabled) return false;
  if (state !== 'anchored' && state !== 'stopped') return false;
  return nowMs - stateSinceMs >= ANCHOR_PAUSE_MS;
}

export interface TrackSummary {
  meanTwsKn: number | null;
  gustSinceKn: number | null;
  gust10mKn: number | null;
  groundNm: number | null;
  logNm: number | null;
  pressureTrend3hHpa: number | null;
  fromPosition: { lat: number; lon: number } | null;
  toPosition: { lat: number; lon: number } | null;
}

export function summarizeTrack(
  samples: TrackSample[],
  sinceMs: number,
  nowMs: number,
  currentPressure: number | null,
): TrackSummary {
  const window = samples.filter(sample => sample.at >= sinceMs && sample.at <= nowMs);
  const tws = window.map(sample => sample.twsKn).filter((value): value is number => value != null);
  const recent = samples.filter(sample => sample.at >= nowMs - 10 * 60_000 && sample.at <= nowMs);
  const gust10 = recent.map(sample => sample.twsKn).filter((value): value is number => value != null);
  const ground = trackDistanceNm(window);
  return {
    meanTwsKn: tws.length ? round1(tws.reduce((sum, value) => sum + value, 0) / tws.length) : null,
    gustSinceKn: tws.length ? round1(Math.max(...tws)) : null,
    gust10mKn: gust10.length ? round1(Math.max(...gust10)) : null,
    groundNm: ground.nm,
    logNm: logDistanceNm(window),
    pressureTrend3hHpa: pressureTrend(samples, nowMs, currentPressure),
    fromPosition: ground.from,
    toPosition: ground.to,
  };
}

export function destinationDistanceNm(
  position: { lat: number; lon: number } | null,
  passage: Passage | null,
): number | null {
  if (!position || !passage || passage.destinationLat == null || passage.destinationLon == null) {
    return null;
  }
  return round1(haversineNm(position, {
    lat: passage.destinationLat,
    lon: passage.destinationLon,
  }));
}

export function vmgKnots(sogKn: number | null, cogDeg: number | null, bearingToDest: number | null): number | null {
  if (sogKn == null || cogDeg == null || bearingToDest == null) return null;
  const delta = wrapSigned180(bearingToDest - cogDeg);
  return round1(sogKn * Math.cos(toRad(delta)));
}

export function etaIso(distanceNm: number | null, meanSogKn: number | null, nowMs: number): string | null {
  if (distanceNm == null || meanSogKn == null || meanSogKn < 0.3) return null;
  const hours = distanceNm / meanSogKn;
  if (!Number.isFinite(hours) || hours > 24 * 60) return null;
  return new Date(nowMs + hours * 3_600_000).toISOString();
}

export function meanSog(values: Array<number | null>): number | null {
  const usable = values.filter((value): value is number => value != null && value >= 0.3);
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

export function propulsionTriggerFor(
  previous: PropulsionState,
  next: PropulsionState,
  passage: Passage | null,
  distanceToDestinationNm: number | null,
): LogTrigger {
  const leftSettled = previous === 'anchored' || previous === 'stopped';
  const underway = next === 'sailing' || next === 'motoring' || next === 'motor-sailing';
  if (leftSettled && underway && passage && !passage.departedAt) return 'departure';
  const radius = passage?.arrivalRadiusNm ?? 0.3;
  if (
    next === 'anchored'
    && passage
    && passage.departedAt
    && !passage.arrivedAt
    && distanceToDestinationNm != null
    && distanceToDestinationNm <= radius
  ) {
    return 'arrival';
  }
  return 'propulsion-change';
}

export function formatLogClock(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  const day = date.getUTCDate();
  const mon = date.toLocaleString('en-GB', { month: 'short', timeZone: 'UTC' });
  const hh = String(date.getUTCHours()).padStart(2, '0');
  const mm = String(date.getUTCMinutes()).padStart(2, '0');
  return `${day} ${mon} ${hh}:${mm}Z`;
}

export function utcDayKey(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso.slice(0, 10);
  return date.toISOString().slice(0, 10);
}

export function utcDayLabel(isoDay: string): string {
  const date = new Date(`${isoDay}T00:00:00Z`);
  if (Number.isNaN(date.getTime())) return isoDay;
  return date.toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function clampOffset(minutes: number): number {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
}

export function clampDebounceMin(minutes: number): number {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(30, Math.round(value)));
}

function trackDistanceNm(samples: TrackSample[]): {
  nm: number | null;
  from: { lat: number; lon: number } | null;
  to: { lat: number; lon: number } | null;
} {
  let prev: { lat: number; lon: number; at: number } | null = null;
  let from: { lat: number; lon: number } | null = null;
  let to: { lat: number; lon: number } | null = null;
  let nm = 0;
  let any = false;
  for (const sample of samples) {
    if (sample.lat == null || sample.lon == null) continue;
    const point = { lat: sample.lat, lon: sample.lon, at: sample.at };
    if (!prev) {
      prev = point;
      from = point;
      to = point;
      continue;
    }
    const leg = haversineNm(prev, point);
    if (leg * METRES_PER_NM < POSITION_JITTER_M) continue;
    const hours = (sample.at - prev.at) / 3_600_000;
    if (hours > 0 && leg / hours > 40) continue;
    nm += leg;
    prev = point;
    to = point;
    any = true;
  }
  if (!from) return { nm: null, from: null, to: null };
  return { nm: any ? round1(nm) : 0, from, to };
}

function logDistanceNm(samples: TrackSample[]): number | null {
  const logs = samples.filter(sample => sample.tripLogM != null);
  if (logs.length < 2) return null;
  const start = logs[0].tripLogM as number;
  const end = logs[logs.length - 1].tripLogM as number;
  const delta = end - start;
  if (delta < 0) return null;
  return round1(delta / METRES_PER_NM);
}

function pressureTrend(
  samples: TrackSample[],
  nowMs: number,
  current: number | null,
): number | null {
  if (current == null) return null;
  const target = nowMs - 3 * 3_600_000;
  let best: TrackSample | null = null;
  let bestGap = 45 * 60_000;
  for (const sample of samples) {
    if (sample.pressureHpa == null) continue;
    const gap = Math.abs(sample.at - target);
    if (gap <= bestGap) {
      best = sample;
      bestGap = gap;
    }
  }
  if (!best || best.pressureHpa == null) return null;
  return round1(current - best.pressureHpa);
}

function formatHemisphere(abs: number, hemi: string, degWidth: number): string {
  const deg = Math.floor(abs);
  const minutes = (abs - deg) * 60;
  const minText = minutes.toFixed(1).padStart(4, '0');
  return `${String(deg).padStart(degWidth, '0')}°${minText}'${hemi}`;
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function toRad(deg: number): number {
  return (deg * Math.PI) / 180;
}

function wrap360(deg: number): number {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function wrapSigned180(deg: number): number {
  const wrapped = wrap360(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}
