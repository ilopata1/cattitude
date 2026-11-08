const {
  angleToDegrees,
  engineRunning,
  knotsFromMps,
  pressureHpa,
  ratioOrPercent,
  rpmFromRevolutions,
  signedAngleToDegrees,
  temperatureC,
} = require('./math');

function createReading() {
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

function ingest(reading, path, value, nowMs) {
  const key = String(path || '').replace(/^self\./, '').replace(/^vessels\.[^.]+\./, '');
  if (value == null) {
    if (key === 'navigation.position') {
      reading.position = null;
      reading.positionAt = null;
      delete reading.seen.position;
    }
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
      if (reading.seen.heading == null) {
        setNumber(reading, 'headingTrueDeg', 'heading', value, nowMs, angleToDegrees);
      }
      return;
    case 'navigation.courseOverGroundTrue':
      setNumber(reading, 'cogDeg', 'cog', value, nowMs, angleToDegrees);
      return;
    case 'navigation.courseOverGroundMagnetic':
      if (reading.seen.cog == null) {
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
      if (reading.seen.depth == null) setNumber(reading, 'depthM', 'depth', value, nowMs, finite);
      return;
    case 'environment.wind.speedTrue':
      setNumber(reading, 'twsKn', 'tws', value, nowMs, knotsFromMps);
      return;
    case 'environment.wind.speedApparent':
      setNumber(reading, 'awsKn', 'aws', value, nowMs, knotsFromMps);
      if (reading.twsKn == null) setNumber(reading, 'twsKn', 'tws', value, nowMs, knotsFromMps);
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
      if (reading.seen.log == null) setNumber(reading, 'tripLogM', 'log', value, nowMs, finite);
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

  if (key === 'environment.current' && value && typeof value === 'object') {
    if (typeof value.setTrue === 'number') {
      setNumber(reading, 'setDeg', 'set', value.setTrue, nowMs, angleToDegrees);
    }
    if (typeof value.drift === 'number') {
      setNumber(reading, 'driftKn', 'drift', value.drift, nowMs, knotsFromMps);
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
  if (tank && typeof value === 'number') ingestTank(reading, tank[2], tank[1], value, nowMs);
}

function enginesRunning(reading) {
  return reading.engines.some((engine) => engine.running);
}

function ingestEngine(reading, id, field, value, nowMs) {
  const engine = ensure(reading.engines, id, () => ({
    id, rpm: null, hours: null, state: null, running: false,
  }));
  if (field === 'revolutions' && typeof value === 'number') engine.rpm = rpmFromRevolutions(value);
  else if (field === 'runTime' && typeof value === 'number' && Number.isFinite(value)) {
    engine.hours = Math.round((value / 3600) * 10) / 10;
  } else if (field === 'state' && typeof value === 'string') engine.state = value;
  else return;
  engine.running = engineRunning(engine.state, engine.rpm);
  mark(reading, 'engines', nowMs);
}

function ingestBattery(reading, id, field, value, nowMs) {
  if (typeof value !== 'number') return;
  const battery = ensure(reading.batteries, id, () => ({ id, soc: null, volts: null }));
  if (field === 'voltage') battery.volts = Math.round(value * 100) / 100;
  if (field === 'capacity.stateOfCharge') battery.soc = ratioOrPercent(value);
  mark(reading, 'batteries', nowMs);
}

function ingestTank(reading, id, type, value, nowMs) {
  const level = ratioOrPercent(value);
  const existing = reading.tanks.find((tank) => tank.id === id && tank.type === type);
  if (existing) existing.level = level;
  else reading.tanks.push({ id, type, level });
  mark(reading, 'tanks', nowMs);
}

function ensure(list, id, create) {
  const existing = list.find((item) => item.id === id);
  if (existing) return existing;
  const created = create();
  list.push(created);
  return created;
}

function setNumber(reading, field, seenKey, value, nowMs, convert) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return;
  const converted = convert(value);
  if (!Number.isFinite(converted)) return;
  reading[field] = converted;
  mark(reading, seenKey, nowMs);
}

function mark(reading, key, nowMs) {
  reading.seen[key] = nowMs;
}

function finite(value) {
  return value;
}

function asPosition(value) {
  if (!value || typeof value !== 'object') return null;
  if (typeof value.latitude !== 'number' || typeof value.longitude !== 'number') return null;
  if (!Number.isFinite(value.latitude) || !Number.isFinite(value.longitude)) return null;
  return { lat: value.latitude, lon: value.longitude };
}

const SUBSCRIBE_PATHS = [
  'navigation.position',
  'navigation.headingTrue',
  'navigation.headingMagnetic',
  'navigation.courseOverGroundTrue',
  'navigation.courseOverGroundMagnetic',
  'navigation.speedOverGround',
  'navigation.speedThroughWater',
  'navigation.speed',
  'navigation.trip.log',
  'navigation.log',
  'navigation.state',
  'environment.depth.*',
  'environment.wind.*',
  'environment.outside.pressure',
  'environment.outside.temperature',
  'environment.water.temperature',
  'environment.current',
  'environment.current.setTrue',
  'environment.current.drift',
  'propulsion.*',
  'electrical.batteries.*',
  'tanks.*',
];

module.exports = {
  SUBSCRIBE_PATHS,
  createReading,
  enginesRunning,
  ingest,
};
