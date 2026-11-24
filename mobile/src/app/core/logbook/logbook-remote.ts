import { LogEntry, LogTrigger, Passage } from '../models/logbook.model';

const TRIGGERS = new Set<LogTrigger>([
  'interval',
  'propulsion-change',
  'sail-change',
  'waypoint',
  'departure',
  'arrival',
  'manual',
  'watch-change',
]);

/** Clever Sailor rows, plus manual lines written in the Signal K logbook. */
export function entriesFromLogentriesBody(body: unknown): LogEntry[] {
  return rowsOf(body)
    .map(logEntryFromResource)
    .filter((entry): entry is LogEntry => entry != null)
    .sort((a, b) => b.at.localeCompare(a.at));
}

export function logEntryFromResource(raw: unknown): LogEntry | null {
  if (!raw || typeof raw !== 'object') return null;
  const row = raw as Record<string, unknown>;
  const embedded = row['x-cattitude'];
  if (isLogEntry(embedded)) return embedded;
  if (row['origin'] === 'auto') return null;
  return thinEntry(row);
}

function rowsOf(body: unknown): unknown[] {
  if (Array.isArray(body)) return body;
  if (!body || typeof body !== 'object') return [];
  return Object.values(body as Record<string, unknown>);
}

function isLogEntry(raw: unknown): raw is LogEntry {
  if (!raw || typeof raw !== 'object') return false;
  const entry = raw as Partial<LogEntry>;
  return typeof entry.id === 'string'
    && typeof entry.at === 'string'
    && typeof entry.trigger === 'string'
    && TRIGGERS.has(entry.trigger);
}

function thinEntry(row: Record<string, unknown>): LogEntry | null {
  const at = typeof row['datetime'] === 'string' ? row['datetime'] : '';
  const id = typeof row['id'] === 'string' ? row['id'] : '';
  const text = typeof row['text'] === 'string' ? row['text'] : '';
  if (!id || !at) return null;
  const position = positionOf(row);
  return {
    id,
    passageId: null,
    at,
    updatedAt: typeof row['timestamp'] === 'string' ? row['timestamp'] : at,
    zoneOffsetMin: 0,
    trigger: 'manual',
    position,
    headingTrueDeg: null,
    cogDeg: null,
    sogKn: null,
    stwKn: null,
    depthM: null,
    wind: {
      twsKn: null,
      twdDeg: null,
      twaDeg: null,
      awsKn: null,
      awaDeg: null,
      meanTwsSinceLastKn: null,
      gustSinceLastKn: null,
      gust10mKn: null,
      beaufort: null,
    },
    pressureHpa: null,
    pressureTrend3hHpa: null,
    airTempC: null,
    seaTempC: null,
    current: { setDeg: null, driftKn: null },
    propulsion: { state: 'stopped', engines: [] },
    sails: { main: '', headsail: '', label: '', recommended: null },
    distances: {
      sinceLastEntryGroundNm: null,
      sinceLastEntryLogNm: null,
      sinceLastWaypointNm: null,
      toDestinationNm: null,
      cmgDeg: null,
      smgKn: null,
      vmgKn: null,
      etaUtc: null,
    },
    ship: { batteries: [], tanks: [] },
    tripLogM: null,
    watch: null,
    seaState: null,
    cloudOktas: null,
    visibilityNm: null,
    remarks: text,
    staleFields: [],
    corrections: [],
  };
}

function positionOf(row: Record<string, unknown>): LogEntry['position'] {
  const telemetry = Array.isArray(row['telemetry']) ? row['telemetry'] : [];
  const found = telemetry.find(item => {
    if (!item || typeof item !== 'object') return false;
    return (item as { path?: string }).path === 'navigation.position';
  }) as { value?: { latitude?: number; longitude?: number } } | undefined;
  const value = found?.value;
  if (!value || typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
  const at = typeof row['datetime'] === 'string' ? row['datetime'] : new Date(0).toISOString();
  return { lat: value.latitude, lon: value.longitude, fixAt: at };
}

export function recorderIsFresh(recordingAt: string | null | undefined, nowMs: number): boolean {
  if (!recordingAt) return false;
  const at = Date.parse(recordingAt);
  return Number.isFinite(at) && nowMs - at < 90_000;
}

export function isPassage(raw: unknown): raw is Passage {
  if (!raw || typeof raw !== 'object') return false;
  const passage = raw as Partial<Passage>;
  return typeof passage.id === 'string' && Array.isArray(passage.waypoints);
}

/** Revisions the boat recorder assigns to each shared part. Missing on older plugins. */
export interface BoatRevs {
  settings: number;
  passage: number;
  rota: number;
  sails: number;
  alerts: number;
  entries: number;
}

export type BoatPart = 'settings' | 'passage' | 'rota' | 'sails' | 'alerts';

export function parseBoatRevs(raw: unknown): BoatRevs | null {
  if (!raw || typeof raw !== 'object') return null;
  const source = raw as Record<string, unknown>;
  const revs: BoatRevs = { settings: 0, passage: 0, rota: 0, sails: 0, alerts: 0, entries: 0 };
  for (const key of Object.keys(revs) as (keyof BoatRevs)[]) {
    const value = Number(source[key]);
    if (!Number.isInteger(value) || value < 0) return null;
    revs[key] = value;
  }
  return revs;
}

/**
 * Whether the boat recorder is running. Compares the boat's own `now` with its
 * `recordingAt`, so a phone clock that is off cannot make the recorder look stopped.
 * Older plugins send no `now`, and then the phone clock is used as before.
 */
export function recorderStatusFresh(
  status: { recordingAt?: string | null; now?: string | null } | null | undefined,
  phoneNowMs: number,
): boolean {
  if (!status) return false;
  const boatNow = status.now ? Date.parse(status.now) : NaN;
  return recorderIsFresh(status.recordingAt, Number.isFinite(boatNow) ? boatNow : phoneNowMs);
}

export type BoatAction = 'adopt' | 'resend' | 'keep';

/**
 * What a phone does with one part after reading the boat's revision.
 * A higher boat revision means someone else changed it: take the boat's copy.
 * A lower one means the boat lost its state (restart, new install): send ours back.
 */
export function boatAction(known: number | null | undefined, boat: number): BoatAction {
  if (known == null) return 'adopt';
  if (boat > known) return 'adopt';
  if (boat < known) return 'resend';
  return 'keep';
}

/**
 * Merge the boat's track with this device's own samples. Boat samples win; a local
 * sample is kept only where the boat has none within `coverMs`, for example while the
 * boat PC was off.
 */
export function mergeTrack<T extends { at: number }>(boat: T[], local: T[], coverMs = 90_000): T[] {
  if (!boat.length) return local.slice();
  const times = boat.map(sample => sample.at);
  const covered = (at: number): boolean => {
    let lo = 0;
    let hi = times.length - 1;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (times[mid] < at) lo = mid + 1;
      else hi = mid;
    }
    const near = [times[lo], times[lo - 1]].filter(value => value != null);
    return near.some(value => Math.abs(value - at) <= coverMs);
  };
  const merged = [...boat, ...local.filter(sample => !covered(sample.at))];
  merged.sort((a, b) => a.at - b.at);
  return merged;
}
