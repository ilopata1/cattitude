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
