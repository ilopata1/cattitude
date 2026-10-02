export type LogTrigger =
  | 'interval'
  | 'propulsion-change'
  | 'sail-change'
  | 'waypoint'
  | 'departure'
  | 'arrival'
  | 'manual'
  | 'watch-change';

export type PropulsionState =
  | 'sailing'
  | 'motoring'
  | 'motor-sailing'
  | 'stopped'
  | 'anchored';

export type LogIntervalHours = 1 | 3 | 6 | 12 | 24;

export interface LogCorrection {
  at: string;
  field: string;
  from: unknown;
  to: unknown;
  by: string;
}

export interface EngineLog {
  id: string;
  rpm: number | null;
  hours: number | null;
}

export interface BatteryLog {
  id: string;
  soc: number | null;
  volts: number | null;
}

export interface TankLog {
  id: string;
  type: string;
  level: number | null;
}

export interface LogEntry {
  id: string;
  passageId: string | null;
  at: string;
  updatedAt: string;
  zoneOffsetMin: number;
  trigger: LogTrigger;
  position: { lat: number; lon: number; fixAt: string } | null;
  headingTrueDeg: number | null;
  cogDeg: number | null;
  sogKn: number | null;
  stwKn: number | null;
  depthM: number | null;
  wind: {
    twsKn: number | null;
    twdDeg: number | null;
    twaDeg: number | null;
    awsKn: number | null;
    awaDeg: number | null;
    meanTwsSinceLastKn: number | null;
    gustSinceLastKn: number | null;
    gust10mKn: number | null;
    beaufort: number | null;
  };
  pressureHpa: number | null;
  pressureTrend3hHpa: number | null;
  airTempC: number | null;
  seaTempC: number | null;
  current: { setDeg: number | null; driftKn: number | null };
  propulsion: {
    state: PropulsionState;
    engines: EngineLog[];
  };
  sails: { main: string; headsail: string; label: string; recommended: string | null };
  distances: {
    sinceLastEntryGroundNm: number | null;
    sinceLastEntryLogNm: number | null;
    sinceLastWaypointNm: number | null;
    toDestinationNm: number | null;
    cmgDeg: number | null;
    smgKn: number | null;
    vmgKn: number | null;
    etaUtc: string | null;
  };
  ship: {
    batteries: BatteryLog[];
    tanks: TankLog[];
  };
  /** Trip log reading (metres) captured with the entry, used for the next log delta. */
  tripLogM: number | null;
  watch: string | null;
  seaState: number | null;
  cloudOktas: number | null;
  visibilityNm: number | null;
  remarks: string;
  staleFields: string[];
  corrections: LogCorrection[];
}

export interface PassageWaypoint {
  id: string;
  name: string;
  lat: number;
  lon: number;
  passedAt: string | null;
}

export interface Passage {
  id: string;
  name: string;
  destinationName: string;
  destinationLat: number | null;
  destinationLon: number | null;
  arrivalRadiusNm: number;
  waypoints: PassageWaypoint[];
  departedAt: string | null;
  arrivedAt: string | null;
  watch: string;
  updatedAt: string;
}

export interface LogbookSettings {
  intervalHours: LogIntervalHours;
  /** Minutes after 00:00 UTC for the first slot. 120 with a 3 h interval logs at 02:00, 05:00, … */
  offsetMinutes: number;
  pauseWhenAnchored: boolean;
  propulsionDebounceMin: number;
  sailDebounceMin: number;
  syncEnabled: boolean;
}

export const DEFAULT_LOGBOOK_SETTINGS: LogbookSettings = {
  intervalHours: 3,
  offsetMinutes: 0,
  pauseWhenAnchored: true,
  propulsionDebounceMin: 2,
  sailDebounceMin: 3,
  syncEnabled: true,
};

export const LOG_INTERVALS: LogIntervalHours[] = [1, 3, 6, 12, 24];

export interface EngineReading {
  id: string;
  rpm: number | null;
  hours: number | null;
  /** Last `propulsion.*.state` string, when the server sends one. */
  state: string | null;
  running: boolean;
}

export interface LiveReading {
  position: { lat: number; lon: number } | null;
  positionAt: string | null;
  headingTrueDeg: number | null;
  cogDeg: number | null;
  sogKn: number | null;
  stwKn: number | null;
  depthM: number | null;
  twsKn: number | null;
  twdDeg: number | null;
  twaDeg: number | null;
  awsKn: number | null;
  awaDeg: number | null;
  pressureHpa: number | null;
  airTempC: number | null;
  seaTempC: number | null;
  setDeg: number | null;
  driftKn: number | null;
  tripLogM: number | null;
  navState: string | null;
  engines: EngineReading[];
  batteries: BatteryLog[];
  tanks: TankLog[];
  /** Field name → last accepted sample time (ms). */
  seen: Record<string, number>;
}

export interface TrackSample {
  at: number;
  lat: number | null;
  lon: number | null;
  twsKn: number | null;
  pressureHpa: number | null;
  tripLogM: number | null;
  sogKn: number | null;
}

export function emptyReading(): LiveReading {
  return {
    position: null,
    positionAt: null,
    headingTrueDeg: null,
    cogDeg: null,
    sogKn: null,
    stwKn: null,
    depthM: null,
    twsKn: null,
    twdDeg: null,
    twaDeg: null,
    awsKn: null,
    awaDeg: null,
    pressureHpa: null,
    airTempC: null,
    seaTempC: null,
    setDeg: null,
    driftKn: null,
    tripLogM: null,
    navState: null,
    engines: [],
    batteries: [],
    tanks: [],
    seen: {},
  };
}
