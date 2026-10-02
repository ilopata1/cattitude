import {
  BatteryLog,
  EngineReading,
  LiveReading,
} from '../models/logbook.model';
import {
  angleToDegrees,
  engineRunning,
  knotsFromMps,
  pressureHpa,
  ratioOrPercent,
  rpmFromRevolutions,
  signedAngleToDegrees,
  temperatureC,
} from './logbook-math';

/**
 * Fold one Signal K value into the live reading. Paths may be relative
 * (`navigation.position`) or prefixed with `self.` / `vessels.<id>.`.
 */
export function ingestSignalK(
  reading: LiveReading,
  path: string,
  value: unknown,
  nowMs: number,
): void {
  const key = stripVessel(path);
  if (value == null) {
    clearPath(reading, key);
    return;
  }

  switch (key) {
    case 'navigation.position': {
      const point = asPosition(value);
      if (!point) return;
      reading.position = point;
      reading.positionAt = new Date(nowMs).toISOString();
      mark(reading, 'position', nowMs);
      return;
    }
    case 'navigation.headingTrue':
      setNumber(reading, 'headingTrueDeg', 'heading', value, nowMs, angleToDegrees);
      return;
    case 'navigation.headingMagnetic':
      if (reading.seen['heading'] == null) {
        setNumber(reading, 'headingTrueDeg', 'heading', value, nowMs, angleToDegrees);
      }
      return;
    case 'navigation.courseOverGroundTrue':
      setNumber(reading, 'cogDeg', 'cog', value, nowMs, angleToDegrees);
      return;
    case 'navigation.courseOverGroundMagnetic':
      if (reading.seen['cog'] == null) {
        setNumber(reading, 'cogDeg', 'cog', value, nowMs, angleToDegrees);
      }
      return;
    case 'navigation.speedOverGround':
      setNumber(reading, 'sogKn', 'sog', value, nowMs, knotsFromMps);
      return;
    case 'navigation.speedThroughWater':
    case 'navigation.speed':
      setNumber(reading, 'stwKn', 'stw', value, nowMs, knotsFromMps);
      return;
    case 'environment.depth.belowSurface':
      setNumber(reading, 'depthM', 'depth', value, nowMs, finite);
      return;
    case 'environment.depth.belowTransducer':
    case 'environment.depth.belowKeel':
      if (reading.seen['depth'] == null) {
        setNumber(reading, 'depthM', 'depth', value, nowMs, finite);
      }
      return;
    case 'environment.wind.speedTrue':
      setNumber(reading, 'twsKn', 'tws', value, nowMs, knotsFromMps);
      return;
    case 'environment.wind.speedApparent':
      setNumber(reading, 'awsKn', 'aws', value, nowMs, knotsFromMps);
      if (reading.twsKn == null) {
        setNumber(reading, 'twsKn', 'tws', value, nowMs, knotsFromMps);
      }
      return;
    case 'environment.wind.directionTrue':
      setNumber(reading, 'twdDeg', 'twd', value, nowMs, angleToDegrees);
      return;
    case 'environment.wind.angleTrueWater':
    case 'environment.wind.angleTrueGround':
      setNumber(reading, 'twaDeg', 'twa', value, nowMs, signedAngleToDegrees);
      return;
    case 'environment.wind.angleApparent':
      setNumber(reading, 'awaDeg', 'awa', value, nowMs, signedAngleToDegrees);
      return;
    case 'environment.outside.pressure':
      setNumber(reading, 'pressureHpa', 'pressure', value, nowMs, (raw) => pressureHpa(raw) ?? Number.NaN);
      return;
    case 'environment.outside.temperature':
      setNumber(reading, 'airTempC', 'air', value, nowMs, (raw) => temperatureC(raw) ?? Number.NaN);
      return;
    case 'environment.water.temperature':
      setNumber(reading, 'seaTempC', 'sea', value, nowMs, (raw) => temperatureC(raw) ?? Number.NaN);
      return;
    case 'environment.current.setTrue':
      setNumber(reading, 'setDeg', 'set', value, nowMs, angleToDegrees);
      return;
    case 'environment.current.drift':
      setNumber(reading, 'driftKn', 'drift', value, nowMs, knotsFromMps);
      return;
    case 'navigation.trip.log':
      setNumber(reading, 'tripLogM', 'log', value, nowMs, finite);
      return;
    case 'navigation.log':
      if (reading.seen['log'] == null) {
        setNumber(reading, 'tripLogM', 'log', value, nowMs, finite);
      }
      return;
    case 'navigation.state':
      if (typeof value === 'string') {
        reading.navState = value;
        mark(reading, 'nav', nowMs);
      }
      return;
    default:
      break;
  }

  if (key === 'environment.current' && typeof value === 'object') {
    const current = value as { setTrue?: unknown; drift?: unknown };
    if (typeof current.setTrue === 'number') {
      setNumber(reading, 'setDeg', 'set', current.setTrue, nowMs, angleToDegrees);
    }
    if (typeof current.drift === 'number') {
      setNumber(reading, 'driftKn', 'drift', current.drift, nowMs, knotsFromMps);
    }
    return;
  }

  const propulsion = key.match(/^propulsion\.([^.]+)\.(revolutions|runTime|state)$/);
  if (propulsion) {
    ingestEngine(reading, propulsion[1], propulsion[2], value, nowMs);
    return;
  }
  const battery = key.match(/^electrical\.batteries\.([^.]+)\.(voltage|capacity\.stateOfCharge)$/);
  if (battery) {
    ingestBattery(reading, battery[1], battery[2], value, nowMs);
    return;
  }
  const tank = key.match(/^tanks\.([^.]+)\.([^.]+)\.currentLevel$/);
  if (tank && typeof value === 'number') {
    ingestTank(reading, tank[2], tank[1], value, nowMs);
  }
}

export function enginesRunning(reading: LiveReading): boolean {
  return reading.engines.some(engine => engine.running);
}

function ingestEngine(
  reading: LiveReading,
  id: string,
  field: string,
  value: unknown,
  nowMs: number,
): void {
  const engine = ensureEngine(reading, id);
  if (field === 'revolutions' && typeof value === 'number') {
    engine.rpm = rpmFromRevolutions(value);
  } else if (field === 'runTime' && typeof value === 'number' && Number.isFinite(value)) {
    engine.hours = Math.round((value / 3600) * 10) / 10;
  } else if (field === 'state' && typeof value === 'string') {
    engine.state = value;
  } else {
    return;
  }
  engine.running = engineRunning(engine.state, engine.rpm);
  mark(reading, 'engines', nowMs);
}

function ingestBattery(
  reading: LiveReading,
  id: string,
  field: string,
  value: unknown,
  nowMs: number,
): void {
  if (typeof value !== 'number') return;
  const battery = ensureBattery(reading, id);
  if (field === 'voltage') battery.volts = Math.round(value * 100) / 100;
  if (field === 'capacity.stateOfCharge') battery.soc = ratioOrPercent(value);
  mark(reading, 'batteries', nowMs);
}

function ingestTank(
  reading: LiveReading,
  id: string,
  type: string,
  value: number,
  nowMs: number,
): void {
  const level = ratioOrPercent(value);
  const existing = reading.tanks.find(tank => tank.id === id && tank.type === type);
  if (existing) existing.level = level;
  else reading.tanks.push({ id, type, level });
  mark(reading, 'tanks', nowMs);
}

function ensureEngine(reading: LiveReading, id: string): EngineReading {
  const existing = reading.engines.find(engine => engine.id === id);
  if (existing) return existing;
  const created: EngineReading = { id, rpm: null, hours: null, state: null, running: false };
  reading.engines.push(created);
  return created;
}

function ensureBattery(reading: LiveReading, id: string): BatteryLog {
  const existing = reading.batteries.find(battery => battery.id === id);
  if (existing) return existing;
  const created: BatteryLog = { id, soc: null, volts: null };
  reading.batteries.push(created);
  return created;
}

function clearPath(reading: LiveReading, key: string): void {
  if (key === 'navigation.position') {
    reading.position = null;
    reading.positionAt = null;
    delete reading.seen['position'];
  }
}

function setNumber<K extends keyof LiveReading>(
  reading: LiveReading,
  field: K,
  seenKey: string,
  value: unknown,
  nowMs: number,
  convert: (raw: number) => number,
): void {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  const converted = convert(value);
  if (!Number.isFinite(converted)) return;
  (reading[field] as number) = converted;
  mark(reading, seenKey, nowMs);
}

function mark(reading: LiveReading, key: string, nowMs: number): void {
  reading.seen[key] = nowMs;
}

function finite(value: number): number {
  return value;
}

function asPosition(value: unknown): { lat: number; lon: number } | null {
  if (!value || typeof value !== 'object') return null;
  const point = value as { latitude?: unknown; longitude?: unknown };
  if (typeof point.latitude !== 'number' || typeof point.longitude !== 'number') return null;
  if (!Number.isFinite(point.latitude) || !Number.isFinite(point.longitude)) return null;
  return { lat: point.latitude, lon: point.longitude };
}

function stripVessel(path: string): string {
  return path.replace(/^self\./, '').replace(/^vessels\.[^.]+\./, '');
}
