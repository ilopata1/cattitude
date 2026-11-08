const { randomUUID } = require('crypto');
const {
  METRES_PER_NM,
  bearingDeg,
  beaufortFromKnots,
  coreStaleFields,
  derivePropulsion,
  destinationDistanceNm,
  etaIso,
  meanSog,
  sailsUp,
  summarizeTrack,
  vmgKnots,
} = require('./math');
const { enginesRunning } = require('./ingest');

const TRIGGER_TEXT = {
  interval: 'Interval',
  'propulsion-change': 'Propulsion change',
  'sail-change': 'Sail change',
  waypoint: 'Waypoint',
  departure: 'Departure',
  arrival: 'Arrival',
  manual: 'Manual entry',
  'watch-change': 'Watch change',
};

function buildEntry(input) {
  const {
    reading,
    samples,
    passage,
    sails,
    trigger,
    remarks,
    nowMs,
    previous,
    recentSog,
  } = input;
  const selection = sails || { main: '', headsail: '', label: '', recommended: null };
  const sailLabel = selection.label
    || [selection.main, selection.headsail].filter(Boolean).join(' + ');
  const sinceEntryMs = previous ? Date.parse(previous.at) : nowMs;
  const lastWaypoint = [...(passage?.waypoints || [])].reverse().find((item) => item.passedAt);
  const sinceWaypointMs = lastWaypoint?.passedAt
    ? Date.parse(lastWaypoint.passedAt)
    : passage?.departedAt
      ? Date.parse(passage.departedAt)
      : sinceEntryMs;
  const sinceEntry = summarizeTrack(
    samplesSince(samples, Math.min(sinceEntryMs, nowMs - 3 * 3_600_000)),
    Number.isFinite(sinceEntryMs) ? sinceEntryMs : nowMs,
    nowMs,
    reading.pressureHpa,
  );
  const sinceWaypoint = summarizeTrack(
    samplesSince(samples, Number.isFinite(sinceWaypointMs) ? sinceWaypointMs : nowMs),
    Number.isFinite(sinceWaypointMs) ? sinceWaypointMs : nowMs,
    nowMs,
    reading.pressureHpa,
  );
  const position = reading.position;
  const dtg = destinationDistanceNm(position, passage);
  const from = previous?.position || sinceEntry.fromPosition;
  const groundNm = sinceEntry.groundNm;
  const hours = previous ? Math.max((nowMs - Date.parse(previous.at)) / 3_600_000, 1 / 60) : null;
  const cmg = from && position ? bearingDeg(from, position) : null;
  const smg = groundNm != null && hours ? Math.round((groundNm / hours) * 10) / 10 : null;
  const destPoint = passage && passage.destinationLat != null && passage.destinationLon != null && position
    ? { lat: passage.destinationLat, lon: passage.destinationLon }
    : null;
  const bearingToDest = position && destPoint ? bearingDeg(position, destPoint) : null;
  const eta = etaIso(dtg, meanSog(recentSog.length ? recentSog : [reading.sogKn]), nowMs);
  const logNm = logDeltaNm(previous?.tripLogM ?? null, reading.tripLogM) ?? sinceEntry.logNm;
  const propulsion = derivePropulsion({
    navState: reading.navState,
    enginesRunning: enginesRunning(reading),
    sailsUp: sailsUp(selection.main, selection.headsail),
    sogKn: reading.sogKn,
  });
  const at = new Date(nowMs).toISOString();
  return {
    id: randomUUID(),
    passageId: passage?.id ?? null,
    at,
    updatedAt: at,
    zoneOffsetMin: -new Date(nowMs).getTimezoneOffset(),
    trigger,
    position: position && reading.positionAt
      ? { lat: position.lat, lon: position.lon, fixAt: reading.positionAt }
      : null,
    headingTrueDeg: round(reading.headingTrueDeg),
    cogDeg: round(reading.cogDeg),
    sogKn: round(reading.sogKn),
    stwKn: round(reading.stwKn),
    depthM: round(reading.depthM),
    wind: {
      twsKn: round(reading.twsKn),
      twdDeg: round(reading.twdDeg),
      twaDeg: round(reading.twaDeg),
      awsKn: round(reading.awsKn),
      awaDeg: round(reading.awaDeg),
      meanTwsSinceLastKn: sinceEntry.meanTwsKn,
      gustSinceLastKn: sinceEntry.gustSinceKn,
      gust10mKn: sinceEntry.gust10mKn,
      beaufort: beaufortFromKnots(reading.twsKn),
    },
    pressureHpa: reading.pressureHpa,
    pressureTrend3hHpa: sinceEntry.pressureTrend3hHpa,
    airTempC: reading.airTempC,
    seaTempC: reading.seaTempC,
    current: { setDeg: round(reading.setDeg), driftKn: round(reading.driftKn) },
    propulsion: {
      state: propulsion,
      engines: reading.engines.map((engine) => ({
        id: engine.id,
        rpm: engine.rpm,
        hours: engine.hours,
      })),
    },
    sails: {
      main: selection.main || '',
      headsail: selection.headsail || '',
      label: sailLabel,
      recommended: selection.recommended || null,
    },
    distances: {
      sinceLastEntryGroundNm: groundNm,
      sinceLastEntryLogNm: logNm,
      sinceLastWaypointNm: passage ? sinceWaypoint.groundNm : null,
      toDestinationNm: dtg,
      cmgDeg: cmg == null ? null : Math.round(cmg),
      smgKn: smg,
      vmgKn: vmgKnots(reading.sogKn, reading.cogDeg, bearingToDest),
      etaUtc: eta,
    },
    ship: {
      batteries: reading.batteries.map((battery) => ({ ...battery })),
      tanks: reading.tanks.map((tank) => ({ ...tank })),
    },
    tripLogM: reading.tripLogM,
    watch: passage?.watch?.trim() || null,
    seaState: null,
    cloudOktas: null,
    visibilityNm: null,
    remarks: (remarks || '').trim(),
    staleFields: coreStaleFields(reading, nowMs),
    corrections: [],
  };
}

function toLogentryResource(entry) {
  return {
    datetime: entry.at,
    text: entry.remarks.trim() || TRIGGER_TEXT[entry.trigger] || 'Log entry',
    origin: entry.trigger === 'manual' ? 'manual' : 'agent',
    category: 'navigation',
    author: 'Cattitude',
    enrich: false,
    telemetry: telemetryFor(entry),
    'x-cattitude': entry,
  };
}

function telemetryFor(entry) {
  const values = [];
  const add = (path, value) => {
    if (value == null || !Number.isFinite(value)) return;
    values.push({ path, value });
  };
  if (entry.position) {
    values.push({
      path: 'navigation.position',
      value: { latitude: entry.position.lat, longitude: entry.position.lon },
    });
  }
  add('navigation.headingTrue', radians(entry.headingTrueDeg));
  add('navigation.courseOverGroundTrue', radians(entry.cogDeg));
  add('navigation.speedOverGround', metresPerSecond(entry.sogKn));
  add('navigation.speedThroughWater', metresPerSecond(entry.stwKn));
  add('navigation.log', entry.tripLogM);
  add('environment.outside.pressure', entry.pressureHpa == null ? null : entry.pressureHpa * 100);
  add('environment.wind.speedOverGround', metresPerSecond(entry.wind?.twsKn));
  add('environment.wind.directionTrue', radians(entry.wind?.twdDeg));
  if (entry.depthM != null) {
    values.push({ path: 'environment.depth.belowSurface', value: entry.depthM });
  }
  for (const engine of entry.propulsion?.engines || []) {
    if (engine.hours != null) {
      values.push({ path: `propulsion.${engine.id}.runTime`, value: engine.hours * 3600 });
    }
  }
  return values;
}

function applyPassageEvent(passage, trigger, at, waypointId) {
  if (!passage) return passage;
  if (trigger === 'departure' && !passage.departedAt) {
    return { ...passage, departedAt: at, updatedAt: at };
  }
  if (trigger === 'arrival' && !passage.arrivedAt) {
    return { ...passage, arrivedAt: at, updatedAt: at };
  }
  if (trigger === 'waypoint' && waypointId) {
    return {
      ...passage,
      updatedAt: at,
      waypoints: (passage.waypoints || []).map((item) => (
        item.id === waypointId ? { ...item, passedAt: at } : item
      )),
    };
  }
  return passage;
}

function samplesSince(samples, sinceMs) {
  return samples.filter((sample) => sample.at >= sinceMs);
}

function logDeltaNm(previousM, currentM) {
  if (previousM == null || currentM == null) return null;
  const delta = currentM - previousM;
  if (delta < 0) return null;
  return Math.round((delta / METRES_PER_NM) * 10) / 10;
}

function radians(deg) {
  if (deg == null || !Number.isFinite(deg)) return null;
  return (deg * Math.PI) / 180;
}

function metresPerSecond(knots) {
  if (knots == null || !Number.isFinite(knots)) return null;
  return knots / 1.943844;
}

function round(value) {
  if (value == null || !Number.isFinite(value)) return null;
  return Math.round(value * 10) / 10;
}

module.exports = {
  TRIGGER_TEXT,
  applyPassageEvent,
  buildEntry,
  toLogentryResource,
};
