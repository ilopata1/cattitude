#!/usr/bin/env node
/**
 * Cattitude / SwingCircle Signal K Test Data Generator
 * =====================================================
 * Standalone WebSocket server that speaks the Signal K delta protocol.
 * Point the app at http://localhost:3000  (ws://localhost:3000/signalk/v1/stream)
 *
 * Usage:
 *   node generator.js [scenario] [--speed <multiplier>] [--port <port>]
 *
 * Speed multiplier:
 *   1    = real time (3-minute steps for anchorage scenarios)
 *   10   = 10x faster (18-second steps)
 *   60   = 60x faster (~3-second steps)  <- good default for UI testing
 *   fast = alias for 60
 *
 * Examples:
 *   node generator.js sailing --speed 60
 *   node generator.js demo --speed 30
 *   node generator.js sail_crossover --speed 10
 *
 * Scenarios:
 *   sailing          Own vessel sailing: TWA/TWS/STW follow the Outremer 55 polar (loops)
 *   polar_underperform  Hold beam reach; polar % falls then recovers (tests advice hint)
 *   sail_crossover   Walk TWA×TWS bands so sail-plan recommendations change
 *   demo             12-vessel Plymouth Sound anchorage -- loops continuously
 *   green_to_red     Two vessels: green -> amber -> red via anchor drag
 *   amber_only       Two vessels: stable amber
 *   sog_filter       Vessel with SOG spikes excluded from anchor calculation
 *   heading_vs_cog   Heading vs COG-only fallback
 *   convergence      Single vessel; watch confidence grow
 *   noisy_heading    Heading noise -- least-squares robustness
 *   multi_vessel     Five vessels, mixed states
 *   all              Cycle through all non-looping test scenarios
 *
 * Vessel dimensions:
 *   All vessels carry design.length.overall and design.beam.maximum in Signal K deltas.
 *   Beam is set to approximately 1/3 of length (realistic for typical cruising yachts).
 *
 * Wind and heading:
 *   All anchored vessels point bow-to-wind. Wind direction rotates slowly over each
 *   scenario, so all vessels swing together -- the way a real anchorage behaves.
 *   Each vessel has a small individual offset (+/-5 deg) to simulate catenary differences.
 */

'use strict';

const WebSocket = require('ws');

// ---- CLI args ---------------------------------------------------------------
const args = process.argv.slice(2);
const scenarioName = args.find(a => !a.startsWith('--')) || 'sailing';
const speedIdx = args.indexOf('--speed');
const portIdx  = args.indexOf('--port');
const speedArg = speedIdx !== -1 ? args[speedIdx + 1] : '60';
const portArg  = portIdx  !== -1 ? args[portIdx  + 1] : '3000';
const SPEED    = speedArg === 'fast' ? 60 : parseFloat(speedArg);
const PORT     = parseInt(portArg, 10);
const STEP_MS  = Math.round((3 * 60 * 1000) / SPEED);  // 3-minute steps compressed

console.log('\n+==================================================+');
console.log('|   Cattitude Signal K Test Generator              |');
console.log('+==================================================+');
console.log('  Scenario : ' + scenarioName);
console.log('  Speed    : ' + SPEED + 'x real time (step = ' + (STEP_MS/1000).toFixed(1) + 's)');
console.log('  Port     : ' + PORT);
console.log('  Connect  : ws://localhost:' + PORT + '/signalk/v1/stream\n');

// ---- Geo helpers ------------------------------------------------------------
const R_EARTH = 6371000; // metres

function offsetLatLon(lat, lon, bearingDeg, distanceM) {
  const bearing = bearingDeg * Math.PI / 180;
  const d = distanceM / R_EARTH;
  const lat1 = lat * Math.PI / 180;
  const lon1 = lon * Math.PI / 180;
  const lat2 = Math.asin(
    Math.sin(lat1) * Math.cos(d) +
    Math.cos(lat1) * Math.sin(d) * Math.cos(bearing)
  );
  const lon2 = lon1 + Math.atan2(
    Math.sin(bearing) * Math.sin(d) * Math.cos(lat1),
    Math.cos(d) - Math.sin(lat1) * Math.sin(lat2)
  );
  return { lat: lat2 * 180 / Math.PI, lon: lon2 * 180 / Math.PI };
}

function lerp(a, b, t) { return a + (b - a) * t; }

function bracket(values, value) {
  if (value <= values[0]) return [0, 0, 0];
  const last = values.length - 1;
  if (value >= values[last]) return [last, last, 0];
  for (let i = 0; i < last; i++) {
    if (value >= values[i] && value <= values[i + 1]) {
      const span = values[i + 1] - values[i];
      return [i, i + 1, span === 0 ? 0 : (value - values[i]) / span];
    }
  }
  return [last, last, 0];
}

// Outremer 55SC polar (matches mobile/src/assets/polars/outremer-55sc.pol)
const POLAR = {
  twa: [50, 60, 70, 80, 90, 100, 110, 120, 130, 140, 150],
  tws: [6, 10, 12, 16, 18, 20, 24, 28],
  grid: [
    [4.1, 5.6, 6.7, 7.5, 8.2, 8.6, 8.7, 8.8],
    [5.1, 6.8, 8.3, 9.6, 10.9, 11.7, 11.9, 12.5],
    [5.7, 7.6, 9.4, 11.2, 13.1, 14.4, 15.5, 16.7],
    [6.1, 8.1, 10.2, 12.4, 15.0, 16.8, 18.4, 19.5],
    [6.3, 8.3, 10.5, 13.0, 16.3, 18.4, 19.9, 20.9],
    [6.2, 8.3, 10.4, 12.8, 16.4, 19.0, 20.7, 21.6],
    [6.0, 7.9, 9.9, 12.1, 15.1, 18.0, 20.3, 21.6],
    [6.2, 8.3, 10.5, 13.0, 16.9, 20.0, 19.9, 21.5],
    [5.7, 7.6, 9.5, 11.6, 14.1, 16.6, 16.6, 19.2],
    [4.8, 7.0, 8.1, 10.6, 12.1, 12.69, 14.5, 16.21],
    [3.8, 6.49, 6.8, 10.17, 12.08, 12.72, 14.0, 17.0],
  ],
};

function polarTarget(twaDeg, twsKnots) {
  const twa = Math.min(POLAR.twa[POLAR.twa.length - 1], Math.max(POLAR.twa[0], Math.abs(twaDeg)));
  const tws = Math.min(POLAR.tws[POLAR.tws.length - 1], Math.max(POLAR.tws[0], twsKnots));
  const [twaLo, twaHi, tTwa] = bracket(POLAR.twa, twa);
  const [twsLo, twsHi, tTws] = bracket(POLAR.tws, tws);
  const s0 = lerp(POLAR.grid[twaLo][twsLo], POLAR.grid[twaLo][twsHi], tTws);
  const s1 = lerp(POLAR.grid[twaHi][twsLo], POLAR.grid[twaHi][twsHi], tTws);
  return lerp(s0, s1, tTwa);
}

function sailingDelta(opts) {
  const {
    lat, lon, twaDeg, twsKnots, polarPct, windDirDeg, name,
  } = opts;
  const target = polarTarget(twaDeg, twsKnots);
  const stw = target * polarPct;
  const headingTrue = normBearing(windDirDeg + twaDeg);
  return vesselDelta(SELF_CTX, {
    lat, lon,
    headingTrue,
    cog: headingTrue,
    sog: stw,
    stw,
    name: name || 'SUPERNOVA',
    lengthM: 16.7,
    mmsi: SELF_MMSI,
    navStatus: 0,
    twsKnots,
    twaDeg,
    windDirDeg,
  });
}

function advanceSailing(lat, lon, headingDeg, stwKnots, dtSec) {
  const distM = stwKnots * 0.514444 * dtSec;
  return offsetLatLon(lat, lon, headingDeg, distM);
}

function jitter(value, range) {
  return value + (Math.random() - 0.5) * 2 * range;
}

function normBearing(deg) {
  return ((deg % 360) + 360) % 360;
}

// ---- Wind model -------------------------------------------------------------
// Returns the wind direction (the direction wind is coming FROM) at step i
// of a scenario with totalSteps steps, interpolated between startDeg and endDeg.
// Interpolation takes the shortest angular path.
// All anchored vessels point their bow INTO the wind (heading = windDir + vesselOffset).
function windDirAtStep(step, totalSteps, startDeg, endDeg) {
  const t = totalSteps <= 1 ? 0 : step / (totalSteps - 1);
  const delta = ((endDeg - startDeg + 540) % 360) - 180;
  return normBearing(startDeg + delta * t);
}

// ---- Vessel dimensions ------------------------------------------------------
// Beam is approx 1/3 of length, rounded to nearest 0.1m.
function beamFromLength(lengthM) {
  return Math.round((lengthM / 3) * 10) / 10;
}

// ---- Signal K delta builder -------------------------------------------------
function makeDelta(context, updates) {
  return JSON.stringify({
    context,
    updates: [{
      timestamp: new Date().toISOString(),
      source: { label: 'cattitude-sim', type: 'SignalK' },
      values: updates
    }]
  });
}

// Build a complete vessel position delta.
// headingTrue and cog in degrees; sog in knots; lengthM in metres.
// Beam is computed automatically from length and emitted as design.beam.maximum.
function vesselDelta(context, opts) {
  const { lat, lon, headingTrue, cog, sog, stw, name, lengthM, navStatus, twsKnots, twaDeg, windDirDeg, mmsi } = opts;
  const values = [
    { path: 'navigation.position', value: { latitude: lat, longitude: lon } },
    { path: 'navigation.speedOverGround', value: sog * 0.514444 }, // knots to m/s
  ];
  if (stw !== undefined) {
    values.push({ path: 'navigation.speedThroughWater', value: stw * 0.514444 });
  }
  if (headingTrue !== undefined) {
    values.push({ path: 'navigation.headingTrue', value: headingTrue * Math.PI / 180 });
  }
  if (cog !== undefined) {
    values.push({ path: 'navigation.courseOverGroundTrue', value: cog * Math.PI / 180 });
  }
  if (twsKnots !== undefined) {
    values.push({ path: 'environment.wind.speedTrue', value: twsKnots * 0.514444 });
  }
  if (twaDeg !== undefined) {
    values.push({ path: 'environment.wind.angleTrueWater', value: twaDeg * Math.PI / 180 });
  }
  if (windDirDeg !== undefined) {
    values.push({ path: 'environment.wind.directionTrue', value: windDirDeg * Math.PI / 180 });
  }
  if (navStatus !== undefined) {
    values.push({ path: 'navigation.state', value: navStatus });
  }
  if (name !== undefined) {
    values.push({ path: 'name', value: name });
  }
  if (mmsi !== undefined) {
    values.push({ path: 'mmsi', value: String(mmsi) });
  } else {
    const m = String(context).match(/mmsi:(\d+)/);
    if (m) values.push({ path: 'mmsi', value: m[1] });
  }
  if (lengthM !== undefined) {
    values.push({ path: 'design.length', value: { overall: lengthM } });
    values.push({ path: 'design.length.overall', value: lengthM });
    values.push({ path: 'design.beam',   value: { maximum: beamFromLength(lengthM) } });
    values.push({ path: 'design.beam.maximum', value: beamFromLength(lengthM) });
  }
  return makeDelta(context, values);
}

// ---- Swing position generator -----------------------------------------------
// Generates vessel positions for each step as wind rotates from windStartDeg to windEndDeg.
// The vessel lies downwind of the anchor; its bow points into the wind.
// vesselOffset: small per-vessel trim offset in degrees to differentiate identical headings.
// omitHeading: if true, headingTrue is not emitted (tests COG fallback).
// useCOGonly: if true, COG has larger noise (simulates GPS-derived course, not compass).
function* swingPositions(anchorLat, anchorLon, rodeM, opts) {
  const windStartDeg    = opts.windStartDeg    !== undefined ? opts.windStartDeg    : 220;
  const windEndDeg      = opts.windEndDeg      !== undefined ? opts.windEndDeg      : 280;
  const vesselOffset    = opts.vesselOffset    !== undefined ? opts.vesselOffset    : 0;
  const headingNoiseDeg = opts.headingNoiseDeg !== undefined ? opts.headingNoiseDeg : 2;
  const steps           = opts.steps           !== undefined ? opts.steps           : 20;
  const omitHeading     = opts.omitHeading     || false;
  const useCOGonly      = opts.useCOGonly      || false;

  for (let i = 0; i < steps; i++) {
    const wDir = windDirAtStep(i, steps, windStartDeg, windEndDeg);

    // Vessel lies downwind: bearing from anchor to vessel = windDir + 180
    const downwindBearing = normBearing(wDir + 180);
    const vesselPos = offsetLatLon(anchorLat, anchorLon, downwindBearing, rodeM);

    // Bow points into wind, plus individual vessel trim offset
    const rawHeading = normBearing(wDir + vesselOffset);
    const heading    = omitHeading ? undefined : jitter(rawHeading, headingNoiseDeg);
    const cogVal     = useCOGonly  ? jitter(rawHeading, 15) : jitter(rawHeading, 5);

    yield {
      lat: jitter(vesselPos.lat, 0.000005),
      lon: jitter(vesselPos.lon, 0.000005),
      headingTrue: omitHeading ? undefined : heading,
      cog: cogVal,
      windDir: wDir,
    };
  }
}

// ---- Signal K hello message -------------------------------------------------
const SELF_CTX  = 'vessels.urn:mrn:imo:mmsi:123456789';
const SELF_MMSI = '123456789';

function helloMessage() {
  return JSON.stringify({
    name: 'cattitude-signalk-sim',
    version: '1.7.0',
    roles: ['master', 'main'],
    self: SELF_CTX,
    timestamp: new Date().toISOString()
  });
}

// ---- Base location: Plymouth Sound, UK --------------------------------------
const BASE_LAT = 50.3550;
const BASE_LON = -4.1450;

const SCENARIOS = {};

// =============================================================================
// SAILING / POLAR SCENARIOS
// =============================================================================

function buildSailingLoop() {
  const steps = [];
  const N = 48;
  const WIND_DIR = 240;
  const dtSec = 30;
  let lat = BASE_LAT;
  let lon = BASE_LON;

  for (let i = 0; i < N; i++) {
    const t = i / (N - 1);
    const twaDeg = 55 + 95 * t;
    const twsKnots = 12 + 6 * Math.sin(t * Math.PI);
    const polarPct = (i >= 28 && i <= 36) ? 0.72 : 0.93;
    const heading = normBearing(WIND_DIR + twaDeg);
    const stw = polarTarget(twaDeg, twsKnots) * polarPct;
    const next = advanceSailing(lat, lon, heading, stw, dtSec);
    lat = next.lat;
    lon = next.lon;

    steps.push({
      label: 'Sailing TWA ' + Math.round(twaDeg) + '°  TWS ' + twsKnots.toFixed(1) +
             ' kn  polar ' + Math.round(polarPct * 100) + '%',
      deltas: [sailingDelta({ lat, lon, twaDeg, twsKnots, polarPct, windDirDeg: WIND_DIR })],
    });
  }
  return steps;
}

function buildPolarUnderperform() {
  const steps = [];
  const N = 40;
  const twaDeg = 90;
  const twsKnots = 16;
  const WIND_DIR = 250;
  let lat = BASE_LAT;
  let lon = BASE_LON + 0.01;

  for (let i = 0; i < N; i++) {
    let polarPct = 0.95;
    if (i >= 10 && i < 18) polarPct = 0.95 - (i - 10) * 0.03;
    else if (i >= 18 && i < 28) polarPct = 0.71;
    else if (i >= 28) polarPct = Math.min(0.95, 0.71 + (i - 28) * 0.025);

    const heading = normBearing(WIND_DIR + twaDeg);
    const stw = polarTarget(twaDeg, twsKnots) * polarPct;
    const next = advanceSailing(lat, lon, heading, stw, 30);
    lat = next.lat;
    lon = next.lon;

    steps.push({
      label: 'Beam reach TWS 16 kn — polar ' + Math.round(polarPct * 100) + '%',
      deltas: [sailingDelta({ lat, lon, twaDeg, twsKnots, polarPct, windDirDeg: WIND_DIR })],
    });
  }
  return steps;
}

function buildSailCrossover() {
  const steps = [];
  const cells = [
    { twa: 40, tws: 6,  note: 'upwind light — main + jib' },
    { twa: 40, tws: 20, note: 'upwind breeze — reef + jib' },
    { twa: 65, tws: 10, note: 'close reach — Code 0' },
    { twa: 65, tws: 16, note: 'Code 0 → jib crossover' },
    { twa: 85, tws: 14, note: 'beam — gennaker / Code 0' },
    { twa: 105, tws: 12, note: 'broad — gennaker / A2' },
    { twa: 125, tws: 18, note: 'run — A2' },
    { twa: 155, tws: 22, note: 'deep run — S4' },
    { twa: 90, tws: 32, note: 'heavy weather overlay' },
  ];
  const WIND_DIR = 270;
  let lat = BASE_LAT - 0.01;
  let lon = BASE_LON;

  cells.forEach(function(cell, idx) {
    for (let k = 0; k < 4; k++) {
      const polarPct = 0.9;
      const heading = normBearing(WIND_DIR + cell.twa);
      const stw = polarTarget(cell.twa, cell.tws) * polarPct;
      const next = advanceSailing(lat, lon, heading, stw, 30);
      lat = next.lat;
      lon = next.lon;
      steps.push({
        label: 'Band ' + (idx + 1) + '/' + cells.length + ': TWA ' + cell.twa +
               '° TWS ' + cell.tws + ' kn — ' + cell.note,
        deltas: [sailingDelta({
          lat, lon, twaDeg: cell.twa, twsKnots: cell.tws, polarPct, windDirDeg: WIND_DIR,
        })],
      });
    }
  });
  return steps;
}

SCENARIOS.sailing = {
  description: 'Own vessel sailing a TWA sweep (55–150°) with TWS 12–18 kn. ' +
               'STW tracks the Outremer 55 polar at ~93%, with a mid-run dip to 72% ' +
               'to exercise polar % and sail-plan advice. Loops continuously.',
  loop: true,
  tickMs: 1000,
  steps: buildSailingLoop(),
};

SCENARIOS.polar_underperform = {
  description: 'Hold a 90° TWA / 16 kn TWS beam reach. Polar performance falls from 95% ' +
               'to ~71% then recovers — Polar page should show the underperformance hint.',
  tickMs: 1000,
  steps: buildPolarUnderperform(),
};

SCENARIOS.sail_crossover = {
  description: 'Steps through TWA×TWS bands matching the Outremer 55 sail-plan template ' +
               'so the Polar advice card changes primary sail (jib, Code 0, gennaker, A2, S4, heavy weather).',
  tickMs: 1500,
  steps: buildSailCrossover(),
};

// =============================================================================
// DEMO SCENARIO -- 12 vessels, continuous loop
// =============================================================================
SCENARIOS.demo = {
  description: '12-vessel Plymouth Sound anchorage. Wind backs SW to SE over the session. ' +
               'All vessels swing in unison. Mixed sizes. Two pairs develop risk states: ' +
               'REDSHANK+DUNLIN go amber (larger circle reaches other anchor), ' +
               'AVOCET+GODWIT go red (larger circle extends past near edge of smaller). ' +
               'CURLEW arrives mid-session. Loops continuously.',
  loop: true,
  steps: buildDemo(),
};

function buildDemo() {
  const steps = [];

  // Fleet: name, MMSI (or 'self'), anchor bearing+distance from BASE, rode, length (m), heading trim offset.
  // Lengths span 8-18m. Beam is computed as length/3.
  // vessels.self = BLUE HERON (own vessel, centres the map in Signal K apps).
  const fleet = [
    // Own vessel -- centre of anchorage
    { name: 'BLUE HERON',   mmsi: 'self',      brg:   0, dist:   0, rode: 45, length: 14, offset:  2 },
    // Well-spaced neighbours -- all green throughout
    { name: 'CORMORANT',    mmsi: '235100001', brg:  35, dist: 155, rode: 42, length: 12, offset: -3 },
    { name: 'OYSTERCATCHER',mmsi: '235100002', brg:  85, dist: 160, rode: 38, length: 10, offset:  4 },
    { name: 'TURNSTONE',    mmsi: '235100003', brg: 140, dist: 145, rode: 50, length: 16, offset: -2 },
    { name: 'SANDERLING',   mmsi: '235100004', brg: 195, dist: 150, rode: 35, length:  9, offset:  3 },
    { name: 'WHIMBREL',     mmsi: '235100005', brg: 250, dist: 160, rode: 55, length: 18, offset: -4 },
    { name: 'KNOT',         mmsi: '235100006', brg: 305, dist: 140, rode: 40, length: 11, offset:  1 },
    // Close pair -- develops AMBER (anchors ~30m apart; REDSHANK radius ~60m reaches DUNLIN anchor)
    { name: 'REDSHANK',     mmsi: '235100007', brg:  60, dist: 100, rode: 50, length: 10, offset:  2 },
    { name: 'DUNLIN',       mmsi: '235100008', brg:  75, dist: 112, rode: 35, length: 11, offset: -3 },
    // Too-close pair -- develops RED (anchors ~12m apart; AVOCET radius ~68m >= 12+44-12=44, margin ~24m)
    { name: 'AVOCET',       mmsi: '235100009', brg: 225, dist:  82, rode: 55, length: 13, offset:  3 },
    { name: 'GODWIT',       mmsi: '235100010', brg: 233, dist:  84, rode: 32, length: 12, offset: -2 },
    // Late arrival -- motors in steps 5-8, then anchors
    { name: 'CURLEW',       mmsi: '235100011', brg: 170, dist: 200, rode: 48, length: 15, offset:  1 },
  ];

  // Wind backs from SW (225 deg) toward SE (155 deg) -- a sea-breeze rotation
  const WIND_START = 225;
  const WIND_END   = 155;
  const N_STEPS    = 30;

  // Build anchor positions relative to base
  const anchors = fleet.map(function(v) {
    return Object.assign({}, v, {
      ctx: v.mmsi === 'self' ? SELF_CTX : 'vessels.urn:mrn:imo:mmsi:' + v.mmsi,
      anchor: v.dist === 0
        ? { lat: BASE_LAT, lon: BASE_LON }
        : offsetLatLon(BASE_LAT, BASE_LON, v.brg, v.dist),
    });
  });

  // Pre-generate swing position sequences for all vessels
  const swings = anchors.map(function(v) {
    return Object.assign({}, v, {
      positions: Array.from(swingPositions(v.anchor.lat, v.anchor.lon, v.rode, {
        windStartDeg: WIND_START,
        windEndDeg:   WIND_END,
        vesselOffset: v.offset,
        headingNoiseDeg: 2,
        steps: N_STEPS,
      })),
    });
  });

  for (var i = 0; i < N_STEPS; i++) {
    const wDir = windDirAtStep(i, N_STEPS, WIND_START, WIND_END);
    const isArrivalPhase = (i >= 5 && i <= 8);

    var stateNote;
    if (i < 9)       stateNote = 'Wind ' + Math.round(wDir) + ' deg -- all vessels settling';
    else if (i < 16) stateNote = 'Wind ' + Math.round(wDir) + ' deg -- REDSHANK/DUNLIN amber, AVOCET/GODWIT red';
    else              stateNote = 'Wind ' + Math.round(wDir) + ' deg -- full anchorage, all states stable';

    const deltas = [];

    for (var j = 0; j < swings.length; j++) {
      const v = swings[j];
      const isCurlew = (v.name === 'CURLEW');

      if (isCurlew && i < 5) continue; // not yet arrived

      if (isCurlew && isArrivalPhase) {
        // Motoring in from the south, SOG 3 knots -- excluded from anchor calculation
        const progressFraction = (i - 5) / 3;
        const approachBearing = 170 + progressFraction * 20;
        const approachDist    = 350 - progressFraction * 150;
        const approachPos     = offsetLatLon(v.anchor.lat, v.anchor.lon, approachBearing, approachDist);
        deltas.push(vesselDelta(v.ctx, {
          lat: approachPos.lat,
          lon: approachPos.lon,
          headingTrue: normBearing(approachBearing + 180),
          sog: 3.0,
          name: v.name,
          lengthM: v.length,
          navStatus: 0,  // underway
        }));
        continue;
      }

      // Normal anchored position
      const pos = v.positions[i];
      deltas.push(vesselDelta(v.ctx, {
        lat: pos.lat,
        lon: pos.lon,
        headingTrue: pos.headingTrue,
        cog: pos.cog,
        sog: 0.1,
        name: v.name,
        lengthM: v.length,
        navStatus: 1,  // at anchor
      }));
    }

    steps.push({ label: 'Demo step ' + (i+1) + '/' + N_STEPS + ': ' + stateNote, deltas: deltas });
  }

  return steps;
}

// =============================================================================
// TEST SCENARIOS
// =============================================================================

// ---- 1. green_to_red --------------------------------------------------------
SCENARIOS.green_to_red = {
  description: 'Two vessels. OSPREY (rode 60m, 14m boat) anchors first. CORMORANT (rode 40m, 10m boat) ' +
               'arrives and anchors 85m away -- initially GREEN. CORMORANT then drags anchor closer: ' +
               'AMBER when the larger circle reaches the other anchor (dist <= ~74m), then ' +
               'RED when it extends past the near edge of the smaller circle.',
  steps: buildGreenToRed(),
};

function buildGreenToRed() {
  const steps = [];
  const OSPREY_CTX    = 'vessels.urn:mrn:imo:mmsi:235001001';
  const CORMORANT_CTX = 'vessels.urn:mrn:imo:mmsi:235001002';
  const oLength = 14;  // 14m, beam 4.7m
  const cLength = 10;  // 10m, beam 3.3m

  const oAnchorLat = BASE_LAT;
  const oAnchorLon = BASE_LON;
  const oRode = 60;   // swingRadius ~ 60 + 14 = 74m
  const cRode = 40;   // swingRadius ~ 40 + 10 = 50m
  const ANCHOR_BEARING = 70;   // bearing from OSPREY to CORMORANT
  const INITIAL_DIST   = 85;   // starting anchor-to-anchor distance

  const WIND_START = 315;  // NW
  const WIND_END   = 225;  // SW
  const TOTAL      = 25;

  // Pre-generate OSPREY's full swing sequence
  const oSwingAll = Array.from(swingPositions(oAnchorLat, oAnchorLon, oRode, {
    windStartDeg: WIND_START, windEndDeg: WIND_END, vesselOffset: 2, steps: TOTAL,
  }));

  // Phase 1 (steps 0-4): OSPREY alone, building confidence
  for (var i = 0; i < 5; i++) {
    const wDir = windDirAtStep(i, TOTAL, WIND_START, WIND_END);
    steps.push({
      label: 'Phase 1 -- Step ' + (i+1) + '/5: OSPREY anchoring. Wind ' + Math.round(wDir) + ' deg',
      deltas: [ vesselDelta(OSPREY_CTX, Object.assign({}, oSwingAll[i], { sog: 0.1, name: 'OSPREY', lengthM: oLength, navStatus: 1 })) ],
    });
  }

  // Phase 2 (steps 5-7): CORMORANT arrives under power (SOG > threshold, excluded from anchor calc)
  const initialAnchor = offsetLatLon(oAnchorLat, oAnchorLon, ANCHOR_BEARING, INITIAL_DIST);
  for (var i = 0; i < 3; i++) {
    const wDir = windDirAtStep(5+i, TOTAL, WIND_START, WIND_END);
    const arrivalBearing = 120 + i * 10;
    const arrivalDist    = 250 - i * 50;
    const arrivalPos     = offsetLatLon(initialAnchor.lat, initialAnchor.lon, arrivalBearing, arrivalDist);
    steps.push({
      label: 'Phase 2 -- Step ' + (i+6) + '/8: CORMORANT arriving (SOG 2.5kn, excluded). Wind ' + Math.round(wDir) + ' deg',
      deltas: [
        vesselDelta(OSPREY_CTX,    Object.assign({}, oSwingAll[5+i], { sog: 0.1, name: 'OSPREY', lengthM: oLength, navStatus: 1 })),
        vesselDelta(CORMORANT_CTX, { lat: arrivalPos.lat, lon: arrivalPos.lon,
          headingTrue: normBearing(arrivalBearing + 180), sog: 2.5, name: 'CORMORANT', lengthM: cLength, navStatus: 0 }),
      ],
    });
  }

  // Phases 3-5 (steps 8-24): Both anchored. CORMORANT drags closer over time.
  //   Phase 3 (8-14):  dist 85m → GREEN  (85 > oRadius ~74)
  //   Phase 4 (15-19): dist ~55m → AMBER (55 <= 74, but 74 < 55+50-10=95 → not red)
  //   Phase 5 (20-24): dist ~20m → RED   (74 >= 20+50-10=60 → red)
  for (var i = 8; i < TOTAL; i++) {
    const wDir = windDirAtStep(i, TOTAL, WIND_START, WIND_END);

    var anchorDist, label;
    if (i < 15) {
      anchorDist = INITIAL_DIST;
      label = 'Phase 3 -- GREEN: anchors 85m apart (> OSPREY radius ~74m). Wind ' + Math.round(wDir) + ' deg';
    } else if (i < 20) {
      var t = (i - 15) / 4;
      anchorDist = 85 - t * 30;  // 85m → 55m
      label = 'Phase 4 -- AMBER: drag to ~' + Math.round(anchorDist) + 'm (larger circle reaches other anchor). Wind ' + Math.round(wDir) + ' deg';
    } else {
      var t = (i - 20) / 4;
      anchorDist = 55 - t * 35;  // 55m → 20m
      label = 'Phase 5 -- RED: drag to ~' + Math.round(anchorDist) + 'm (larger circle past near edge of smaller). Wind ' + Math.round(wDir) + ' deg';
    }

    var cAnchor = offsetLatLon(oAnchorLat, oAnchorLon, ANCHOR_BEARING, anchorDist);
    var downwindBearing = normBearing(wDir + 180);
    var cPos = offsetLatLon(cAnchor.lat, cAnchor.lon, downwindBearing, cRode);
    var rawHeading = normBearing(wDir - 3);

    steps.push({
      label: label,
      deltas: [
        vesselDelta(OSPREY_CTX, Object.assign({}, oSwingAll[i], { sog: 0.1, name: 'OSPREY', lengthM: oLength, navStatus: 1 })),
        vesselDelta(CORMORANT_CTX, {
          lat: jitter(cPos.lat, 0.000005), lon: jitter(cPos.lon, 0.000005),
          headingTrue: jitter(rawHeading, 2), cog: jitter(rawHeading, 5),
          sog: 0.1, name: 'CORMORANT', lengthM: cLength, navStatus: 1,
        }),
      ],
    });
  }

  return steps;
}

// ---- 2. sog_filter ----------------------------------------------------------
SCENARIOS.sog_filter = {
  description: 'PETREL at anchor with periodic SOG spikes (boat wash). ' +
               'Spike positions must be excluded. Anchor calc should stay stable.',
  steps: buildSOGFilter(),
};

function buildSOGFilter() {
  const steps = [];
  const CTX = 'vessels.urn:mrn:imo:mmsi:235002001';
  const anchorLat = BASE_LAT + 0.002;
  const anchorLon = BASE_LON - 0.003;
  const N = 18;
  const positions = Array.from(swingPositions(anchorLat, anchorLon, 40, {
    windStartDeg: 200, windEndDeg: 260, steps: N,
  }));

  for (var i = 0; i < N; i++) {
    const pos = positions[i];
    const wDir = windDirAtStep(i, N, 200, 260);
    const isSpike = (i % 4 === 3);
    if (isSpike) {
      const spikePos = offsetLatLon(pos.lat, pos.lon, 45, 60);
      const sogVal = parseFloat((0.7 + Math.random() * 0.4).toFixed(2));
      steps.push({
        label: 'Step ' + (i+1) + ': SOG SPIKE ' + sogVal + 'kn -- EXCLUDED. Wind ' + Math.round(wDir) + ' deg',
        deltas: [ vesselDelta(CTX, { lat: spikePos.lat, lon: spikePos.lon,
          headingTrue: pos.headingTrue, sog: sogVal, name: 'PETREL', lengthM: 11, navStatus: 1 }) ],
      });
    } else {
      steps.push({
        label: 'Step ' + (i+1) + ': Normal (SOG 0.1kn) -- included. Wind ' + Math.round(wDir) + ' deg',
        deltas: [ vesselDelta(CTX, Object.assign({}, pos, { sog: 0.1, name: 'PETREL', lengthM: 11, navStatus: 1 })) ],
      });
    }
  }
  return steps;
}

// ---- 3. heading_vs_cog ------------------------------------------------------
SCENARIOS.heading_vs_cog = {
  description: 'FALCON has headingTrue (compass). SWIFT has only COG. ' +
               'Tests heading preference logic and COG fallback (SOG > 0.3kn). ' +
               'Both vessels swing together with shared wind.',
  steps: buildHeadingVsCOG(),
};

function buildHeadingVsCOG() {
  const steps = [];
  const FALCON_CTX = 'vessels.urn:mrn:imo:mmsi:235003001';
  const SWIFT_CTX  = 'vessels.urn:mrn:imo:mmsi:235003002';
  const fAnchor = { lat: BASE_LAT - 0.001, lon: BASE_LON + 0.002 };
  const sAnchor = offsetLatLon(fAnchor.lat, fAnchor.lon, 150, 130);
  const N = 16;

  const falconPos = Array.from(swingPositions(fAnchor.lat, fAnchor.lon, 50, {
    windStartDeg: 240, windEndDeg: 300, vesselOffset:  2, headingNoiseDeg: 3, steps: N,
  }));
  const swiftPos = Array.from(swingPositions(sAnchor.lat, sAnchor.lon, 40, {
    windStartDeg: 240, windEndDeg: 300, vesselOffset: -4,
    omitHeading: true, useCOGonly: true, steps: N,
  }));

  for (var i = 0; i < N; i++) {
    const wDir = windDirAtStep(i, N, 240, 300);
    steps.push({
      label: 'Step ' + (i+1) + ': FALCON uses headingTrue; SWIFT uses COG fallback. Wind ' + Math.round(wDir) + ' deg',
      deltas: [
        vesselDelta(FALCON_CTX, Object.assign({}, falconPos[i], { sog: 0.1,  name: 'FALCON', lengthM: 14, navStatus: 1 })),
        vesselDelta(SWIFT_CTX,  Object.assign({}, swiftPos[i],  { sog: 0.35, name: 'SWIFT',  lengthM:  9, navStatus: 1 })),
      ],
    });
  }
  return steps;
}

// ---- 4. convergence ---------------------------------------------------------
SCENARIOS.convergence = {
  description: 'Single vessel ALBATROSS. Watch confidence grow: ' +
               'unknown -> no circle -> low <5 -> medium 5-15 -> high >15 positions. ' +
               'Wind rotates 180 deg over the scenario for a full swing.',
  steps: buildConvergence(),
};

function buildConvergence() {
  const steps = [];
  const CTX = 'vessels.urn:mrn:imo:mmsi:235004001';
  const anchorLat = BASE_LAT + 0.003;
  const anchorLon = BASE_LON + 0.001;
  const N = 22;
  const positions = Array.from(swingPositions(anchorLat, anchorLon, 55, {
    windStartDeg: 180, windEndDeg: 310, vesselOffset: 3, headingNoiseDeg: 5, steps: N,
  }));

  for (var i = 0; i < N; i++) {
    const wDir = windDirAtStep(i, N, 180, 310);
    var confidence;
    if (i === 0)     confidence = 'no circle yet (need 2+ positions)';
    else if (i < 5)  confidence = 'LOW confidence (' + (i+1) + ' positions)';
    else if (i < 15) confidence = 'MEDIUM confidence (' + (i+1) + ' positions)';
    else             confidence = 'HIGH confidence (' + (i+1) + ' positions)';

    steps.push({
      label: 'Step ' + (i+1) + '/22: ' + confidence + ' -- Wind ' + Math.round(wDir) + ' deg',
      deltas: [ vesselDelta(CTX, Object.assign({}, positions[i], { sog: 0.1, name: 'ALBATROSS', lengthM: 16, navStatus: 1 })) ],
    });
  }
  return steps;
}

// ---- 5. noisy_heading -------------------------------------------------------
SCENARIOS.noisy_heading = {
  description: 'GANNET has very noisy heading data (+/-20 deg). ' +
               'Tests robustness of least-squares CPA algorithm. ' +
               'Anchor point should converge to within ~10m of truth despite noise.',
  steps: buildNoisyHeading(),
};

function buildNoisyHeading() {
  const steps = [];
  const CTX = 'vessels.urn:mrn:imo:mmsi:235005001';
  const anchorLat = BASE_LAT - 0.002;
  const anchorLon = BASE_LON - 0.001;
  const N = 20;
  const positions = Array.from(swingPositions(anchorLat, anchorLon, 45, {
    windStartDeg: 270, windEndDeg: 330, headingNoiseDeg: 20, steps: N,
  }));

  for (var i = 0; i < N; i++) {
    const wDir = windDirAtStep(i, N, 270, 330);
    steps.push({
      label: 'Step ' + (i+1) + ': Noisy heading +/-20 deg. True wind ' + Math.round(wDir) + ' deg',
      deltas: [ vesselDelta(CTX, Object.assign({}, positions[i], { sog: 0.1, name: 'GANNET', lengthM: 13, navStatus: 1 })) ],
    });
  }
  return steps;
}

// ---- 6. amber_only ----------------------------------------------------------
SCENARIOS.amber_only = {
  description: 'MERLIN (rode 70m, 12m boat, radius ~82m) and KESTREL (rode 35m, 10m boat, radius ~45m). ' +
               'Anchors 55m apart. Larger circle reaches the other anchor (55 <= 82, margin ~27m) -> AMBER. ' +
               'But NOT red (82 < 55 + 45 - 10 = 90, margin ~8m). Tests that amber and red are distinct.',
  steps: buildAmberOnly(),
};

function buildAmberOnly() {
  const steps = [];
  const MERLIN_CTX  = 'vessels.urn:mrn:imo:mmsi:235006001';
  const KESTREL_CTX = 'vessels.urn:mrn:imo:mmsi:235006002';
  const mLength = 12;  // swingRadius ~ 70 + 12 = 82m
  const kLength = 10;  // swingRadius ~ 35 + 10 = 45m
  const mAnchor = { lat: BASE_LAT + 0.001, lon: BASE_LON - 0.002 };
  const kAnchor = offsetLatLon(mAnchor.lat, mAnchor.lon, 80, 55);
  const N = 16;

  const mPos = Array.from(swingPositions(mAnchor.lat, mAnchor.lon, 70, {
    windStartDeg: 250, windEndDeg: 200, vesselOffset:  3, steps: N,
  }));
  const kPos = Array.from(swingPositions(kAnchor.lat, kAnchor.lon, 35, {
    windStartDeg: 250, windEndDeg: 200, vesselOffset: -2, steps: N,
  }));

  for (var i = 0; i < N; i++) {
    const wDir = windDirAtStep(i, N, 250, 200);
    steps.push({
      label: 'Step ' + (i+1) + ': AMBER -- larger circle (82m) reaches other anchor; dist 55m <= 82m. Wind ' + Math.round(wDir) + ' deg',
      deltas: [
        vesselDelta(MERLIN_CTX,  Object.assign({}, mPos[i], { sog: 0.1, name: 'MERLIN',  lengthM: mLength, navStatus: 1 })),
        vesselDelta(KESTREL_CTX, Object.assign({}, kPos[i], { sog: 0.1, name: 'KESTREL', lengthM: kLength, navStatus: 1 })),
      ],
    });
  }
  return steps;
}

// ---- 7. multi_vessel --------------------------------------------------------
SCENARIOS.multi_vessel = {
  description: 'Five vessels: HERON (own vessel), CURLEW, PLOVER, REDSHANK, DUNLIN. ' +
               'Mixed states: REDSHANK+DUNLIN go red (anchors ~25m apart, REDSHANK radius ~73m >= 25+40-10, margin ~18m). ' +
               'All swing together with shared wind.',
  steps: buildMultiVessel(),
};

function buildMultiVessel() {
  const steps = [];
  const vesselDefs = [
    { ctx: 'vessels.self',                          anchor: { lat: BASE_LAT, lon: BASE_LON },                            rode: 40, length: 14, offset:  2, name: 'HERON'    },
    { ctx: 'vessels.urn:mrn:imo:mmsi:235007002',   anchor: offsetLatLon(BASE_LAT, BASE_LON,  40, 140),                  rode: 38, length: 11, offset: -3, name: 'CURLEW'   },
    { ctx: 'vessels.urn:mrn:imo:mmsi:235007003',   anchor: offsetLatLon(BASE_LAT, BASE_LON, 130, 130),                  rode: 42, length: 12, offset:  4, name: 'PLOVER'   },
    { ctx: 'vessels.urn:mrn:imo:mmsi:235007004',   anchor: offsetLatLon(BASE_LAT, BASE_LON, 220,  92),                  rode: 60, length: 13, offset: -1, name: 'REDSHANK' },
    { ctx: 'vessels.urn:mrn:imo:mmsi:235007005',   anchor: offsetLatLon(BASE_LAT, BASE_LON, 235,  95),                  rode: 30, length: 10, offset:  3, name: 'DUNLIN'   },
  ];

  const WIND_START = 300, WIND_END = 240;
  const N = 20;

  const swings = vesselDefs.map(function(v) {
    return Object.assign({}, v, {
      positions: Array.from(swingPositions(v.anchor.lat, v.anchor.lon, v.rode, {
        windStartDeg: WIND_START, windEndDeg: WIND_END,
        vesselOffset: v.offset, headingNoiseDeg: 3, steps: N,
      })),
    });
  });

  for (var i = 0; i < N; i++) {
    const wDir = windDirAtStep(i, N, WIND_START, WIND_END);
    const stateNote = i < 8
      ? 'all green -- Wind ' + Math.round(wDir) + ' deg'
      : 'REDSHANK+DUNLIN RED -- Wind ' + Math.round(wDir) + ' deg';

    steps.push({
      label: 'Step ' + (i+1) + '/' + N + ': 5-vessel anchorage -- ' + stateNote,
      deltas: swings.map(function(v) {
        return vesselDelta(v.ctx, Object.assign({}, v.positions[i], {
          sog: 0.1, name: v.name, lengthM: v.length, navStatus: 1,
        }));
      }),
    });
  }
  return steps;
}

// ---- all --------------------------------------------------------------------
SCENARIOS.all = {
  description: 'Cycles through all test scenarios in sequence (excludes demo). ' +
               'Brief pause between each.',
  steps: null,
};

// =============================================================================
// SERVER
// =============================================================================

const wss = new WebSocket.Server({ port: PORT });
const clients = new Set();

// Scenario runner state -- used to detect when a scenario is idle so a
// reconnecting client can trigger a replay.
const runner = {
  idle: true,          // true when no scenario is currently running
  trigger: null,       // resolve() of the current waitForClient() promise
  pendingReplay: false, // client connected in the idle window before trigger was set
};

wss.on('listening', function() {
  console.log('Signal K simulator listening on ws://localhost:' + PORT);
  console.log('Connect your app to: ws://localhost:' + PORT + '/signalk/v1/stream\n');
  startScenarios();
});

wss.on('connection', function(ws, req) {
  const url = req.url || '/';
  console.log('  <- Client connected (' + url + ')');
  clients.add(ws);

  if (url.includes('/signalk') && !url.includes('/stream')) {
    ws.send(JSON.stringify({
      endpoints: {
        v1: {
          version: '1.7.0',
          'signalk-http': 'http://localhost:' + PORT + '/signalk/v1/api/',
          'signalk-ws':   'ws://localhost:'   + PORT + '/signalk/v1/stream',
        }
      },
          server: { id: 'cattitude-sim', version: '1.0.0' }
    }));
  } else {
    ws.send(helloMessage());

    // If the scenario is idle (already finished), a new stream connection
    // triggers a replay. If waitForClient() hasn't installed its trigger yet
    // (narrow race window), set pendingReplay so it resolves immediately.
    console.log('  [debug] stream connect: idle=' + runner.idle + ' trigger=' + !!runner.trigger + ' pending=' + runner.pendingReplay);
    if (runner.idle) {
      if (runner.trigger) {
        console.log('  [reconnect] Client reconnected -- replaying scenario from start.\n');
        runner.trigger();
        runner.trigger = null;
      } else {
        runner.pendingReplay = true;
      }
    }
  }

  ws.on('close', function() { clients.delete(ws); console.log('  -> Client disconnected'); });
  ws.on('error', function() { clients.delete(ws); });
});

function broadcast(msg) {
  clients.forEach(function(ws) {
    if (ws.readyState === WebSocket.OPEN) ws.send(msg);
  });
}

function sleep(ms) {
  return new Promise(function(resolve) { setTimeout(resolve, ms); });
}

// Returns a promise that resolves on the next new stream client connection.
// If a client connected during the narrow window between runner.idle being set
// and this function being called (runner.pendingReplay), resolve immediately.
function waitForClient() {
  if (runner.pendingReplay) {
    runner.pendingReplay = false;
    return Promise.resolve();
  }
  return new Promise(function(resolve) {
    runner.trigger = resolve;
  });
}

async function runScenario(scenario) {
  console.log('\n' + '-'.repeat(60));
  console.log('SCENARIO: ' + scenario.description);
  console.log('-'.repeat(60));
  console.log('  ' + scenario.steps.length + ' steps x ' + ((scenario.tickMs || STEP_MS)/1000).toFixed(1) + 's = ' +
              ((scenario.steps.length * (scenario.tickMs || STEP_MS))/60000).toFixed(1) + ' min total\n');

  runner.idle = false;

  for (var i = 0; i < scenario.steps.length; i++) {
    const step = scenario.steps[i];
    console.log('  [' + String(i+1).padStart(2) + '/' + scenario.steps.length + '] ' + step.label);
    for (var j = 0; j < step.deltas.length; j++) broadcast(step.deltas[j]);
    if (i < scenario.steps.length - 1) await sleep(scenario.tickMs || STEP_MS);
  }

  // Mark idle before yielding so any connection event that fires on the next
  // tick finds runner.idle already true and can trigger the replay itself.
  runner.idle = true;
  // Yield to the event loop so any pending connection events are processed
  // before waitForClient() installs runner.trigger.
  await sleep(0);
  console.log('\n  Scenario complete.\n');
}

async function startScenarios() {
  await sleep(500);

  if (scenarioName === 'all') {
    const names = Object.keys(SCENARIOS).filter(function(k) {
      return k !== 'all' && !SCENARIOS[k].loop;
    });
    // 'all' mode: run each scenario once, then wait for reconnect to cycle again
    while (true) {
      console.log('\nRunning all ' + names.length + ' test scenarios in sequence...\n');
      for (var ni = 0; ni < names.length; ni++) {
        const name = names[ni];
        console.log('\n> Starting: ' + name);
        if (!SCENARIOS[name].steps || !SCENARIOS[name].steps.length) {
          console.log('  (skipping -- no steps)'); continue;
        }
        await runScenario(SCENARIOS[name]);
        if (ni < names.length - 1) {
          console.log('  Pausing 5s before next scenario...');
          await sleep(5000);
        }
      }
      console.log('All scenarios complete. Reconnect your app to replay from the start.\n');
      await waitForClient();
      await sleep(1000); // brief gap before restarting
    }
  }

  const scenario = SCENARIOS[scenarioName];
  if (!scenario) {
    console.error('Unknown scenario: "' + scenarioName + '"');
    console.error('Available: ' + Object.keys(SCENARIOS).join(', '));
    process.exit(1);
  }

  // demo loops continuously without waiting; test scenarios replay on reconnect
  if (scenario.loop) {
    console.log('Loop mode active -- Ctrl+C to stop.\n');
    while (true) {
      await runScenario(scenario);
      console.log('  Restarting...\n');
      await sleep(3000);
    }
  } else {
    // Run once, then wait for each reconnect to replay
    while (true) {
      await runScenario(scenario);
      console.log('Reconnect your app (or restart the client) to replay from the start.\n');
      await waitForClient();
      await sleep(500); // small gap so the hello message lands before data starts
    }
  }
}
