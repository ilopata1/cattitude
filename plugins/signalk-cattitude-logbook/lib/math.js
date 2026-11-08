const METRES_PER_NM = 1852;
const MPS_TO_KNOTS = 1.943844;
const RAD_TO_DEG = 180 / Math.PI;
const BEAUFORT_MAX_KN = [1, 3, 6, 10, 16, 21, 27, 33, 40, 47, 55, 63];
const ANCHOR_PAUSE_MS = 15 * 60 * 1000;
const STALE_AFTER_MS = 60_000;
const POSITION_JITTER_M = 5;

function haversineNm(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLat = lat2 - lat1;
  const dLon = toRad(b.lon - a.lon);
  const h = Math.sin(dLat / 2) ** 2
    + Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  const km = 6371 * 2 * Math.atan2(Math.sqrt(h), Math.sqrt(1 - h));
  return (km * 1000) / METRES_PER_NM;
}

function bearingDeg(a, b) {
  const lat1 = toRad(a.lat);
  const lat2 = toRad(b.lat);
  const dLon = toRad(b.lon - a.lon);
  const y = Math.sin(dLon) * Math.cos(lat2);
  const x = Math.cos(lat1) * Math.sin(lat2) - Math.sin(lat1) * Math.cos(lat2) * Math.cos(dLon);
  return wrap360((Math.atan2(y, x) * 180) / Math.PI);
}

function beaufortFromKnots(knots) {
  if (knots == null || !Number.isFinite(knots) || knots < 0) return null;
  for (let force = 0; force < BEAUFORT_MAX_KN.length; force += 1) {
    if (knots < BEAUFORT_MAX_KN[force]) return force;
  }
  return 12;
}

function knotsFromMps(mps) {
  return mps * MPS_TO_KNOTS;
}

function angleToDegrees(value) {
  const deg = Math.abs(value) <= Math.PI * 2 + 0.01 ? value * RAD_TO_DEG : value;
  return wrap360(deg);
}

function signedAngleToDegrees(value) {
  const deg = Math.abs(value) <= Math.PI * 2 + 0.01 ? value * RAD_TO_DEG : value;
  return wrapSigned180(deg);
}

function pressureHpa(value) {
  if (!Number.isFinite(value) || value <= 0) return null;
  const hpa = value > 2000 ? value / 100 : value;
  if (hpa < 800 || hpa > 1100) return null;
  return round1(hpa);
}

function temperatureC(value) {
  if (!Number.isFinite(value)) return null;
  const c = value > 150 ? value - 273.15 : value;
  if (c < -80 || c > 80) return null;
  return round1(c);
}

function rpmFromRevolutions(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const rpm = value <= 120 ? value * 60 : value;
  return Math.round(rpm);
}

function engineRunning(state, rpm) {
  if ((state || '').toLowerCase() === 'started') return true;
  return rpm != null && rpm >= 300;
}

function ratioOrPercent(value) {
  if (!Number.isFinite(value) || value < 0) return null;
  const ratio = value > 1 ? value / 100 : value;
  if (ratio > 1.5) return null;
  return Math.round(ratio * 1000) / 1000;
}

function derivePropulsion(input) {
  const nav = (input.navState || '').toLowerCase();
  if (nav === 'anchored' || nav === 'moored') return 'anchored';
  if (input.enginesRunning && input.sailsUp) return 'motor-sailing';
  if (input.enginesRunning) return 'motoring';
  if (input.sailsUp) return 'sailing';
  if ((input.sogKn ?? 0) < 0.4) return 'stopped';
  return 'sailing';
}

function sailsUp(main, headsail) {
  return !!((main || '').trim() || (headsail || '').trim());
}

function readingUsable(reading) {
  return reading.position != null
    || reading.sogKn != null
    || reading.twsKn != null
    || reading.headingTrueDeg != null;
}

function coreStaleFields(reading, nowMs) {
  const fields = [
    ['position', reading.position ? reading.positionAt : null],
    ['heading', reading.headingTrueDeg],
    ['sog', reading.sogKn],
    ['tws', reading.twsKn],
    ['pressure', reading.pressureHpa],
  ];
  const stale = [];
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

function clampOffset(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return 0;
  return Math.max(0, Math.min(23 * 60 + 59, Math.round(value)));
}

function clampDebounceMin(minutes) {
  const value = Number(minutes);
  if (!Number.isFinite(value)) return 2;
  return Math.max(1, Math.min(30, Math.round(value)));
}

function latestSlotMs(nowMs, intervalHours, offsetMinutes) {
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

function intervalDue(nowMs, lastIntervalAtMs, intervalHours, offsetMinutes) {
  const slot = latestSlotMs(nowMs, intervalHours, offsetMinutes);
  return nowMs >= slot && lastIntervalAtMs < slot;
}

function anchoringPauseActive(state, stateSinceMs, nowMs, enabled) {
  if (!enabled) return false;
  if (state !== 'anchored' && state !== 'stopped') return false;
  return nowMs - stateSinceMs >= ANCHOR_PAUSE_MS;
}

function summarizeTrack(samples, sinceMs, nowMs, currentPressure) {
  const window = samples.filter((sample) => sample.at >= sinceMs && sample.at <= nowMs);
  const tws = window.map((sample) => sample.twsKn).filter((value) => value != null);
  const recent = samples.filter((sample) => sample.at >= nowMs - 10 * 60_000 && sample.at <= nowMs);
  const gust10 = recent.map((sample) => sample.twsKn).filter((value) => value != null);
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

function destinationDistanceNm(position, passage) {
  if (!position || !passage || passage.destinationLat == null || passage.destinationLon == null) {
    return null;
  }
  return round1(haversineNm(position, {
    lat: passage.destinationLat,
    lon: passage.destinationLon,
  }));
}

function vmgKnots(sogKn, cogDeg, bearingToDest) {
  if (sogKn == null || cogDeg == null || bearingToDest == null) return null;
  const delta = wrapSigned180(bearingToDest - cogDeg);
  return round1(sogKn * Math.cos(toRad(delta)));
}

function etaIso(distanceNm, meanSogKn, nowMs) {
  if (distanceNm == null || meanSogKn == null || meanSogKn < 0.3) return null;
  const hours = distanceNm / meanSogKn;
  if (!Number.isFinite(hours) || hours > 24 * 60) return null;
  return new Date(nowMs + hours * 3_600_000).toISOString();
}

function meanSog(values) {
  const usable = values.filter((value) => value != null && value >= 0.3);
  if (!usable.length) return null;
  return usable.reduce((sum, value) => sum + value, 0) / usable.length;
}

function propulsionTriggerFor(previous, next, passage, distanceToDestinationNm) {
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

function normalizeSettings(raw) {
  const hours = raw && raw.intervalHours;
  const intervalHours = hours === 1 || hours === 3 || hours === 6 || hours === 12 || hours === 24
    ? hours
    : 3;
  return {
    intervalHours,
    offsetMinutes: clampOffset(raw?.offsetMinutes ?? 0),
    pauseWhenAnchored: raw?.pauseWhenAnchored ?? true,
    propulsionDebounceMin: clampDebounceMin(raw?.propulsionDebounceMin ?? 2),
    sailDebounceMin: clampDebounceMin(raw?.sailDebounceMin ?? 3),
    syncEnabled: raw?.syncEnabled ?? true,
  };
}

function trackDistanceNm(samples) {
  let prev = null;
  let from = null;
  let to = null;
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

function logDistanceNm(samples) {
  const logs = samples.filter((sample) => sample.tripLogM != null);
  if (logs.length < 2) return null;
  const start = logs[0].tripLogM;
  const end = logs[logs.length - 1].tripLogM;
  const delta = end - start;
  if (delta < 0) return null;
  return round1(delta / METRES_PER_NM);
}

function pressureTrend(samples, nowMs, current) {
  if (current == null) return null;
  const target = nowMs - 3 * 3_600_000;
  let best = null;
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

function round1(value) {
  return Math.round(value * 10) / 10;
}

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function wrap360(deg) {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function wrapSigned180(deg) {
  const wrapped = wrap360(deg);
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

module.exports = {
  ANCHOR_PAUSE_MS,
  METRES_PER_NM,
  anchoringPauseActive,
  angleToDegrees,
  beaufortFromKnots,
  bearingDeg,
  clampDebounceMin,
  clampOffset,
  coreStaleFields,
  derivePropulsion,
  destinationDistanceNm,
  engineRunning,
  etaIso,
  haversineNm,
  intervalDue,
  knotsFromMps,
  latestSlotMs,
  meanSog,
  normalizeSettings,
  pressureHpa,
  propulsionTriggerFor,
  ratioOrPercent,
  rpmFromRevolutions,
  sailsUp,
  signedAngleToDegrees,
  summarizeTrack,
  temperatureC,
  vmgKnots,
  readingUsable,
};
