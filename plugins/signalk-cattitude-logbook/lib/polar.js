/**
 * Polar history recorded on the boat.
 *
 * The phone used to keep this buffer itself, so leaving the page stopped the
 * chart. Samples are taken once a second while speed and wind are fresh, and
 * kept for the hour the chart displays.
 */

const POLAR_SAMPLE_MS = 1_000;
const POLAR_RETAIN_MS = 60 * 60 * 1000;
const POLAR_FRESH_MS = 15_000;
const POLAR_MIN_GAP_MS = 500;
/** About 0.1 knot. Below this, speed through water is treated as "no log". */
const STW_MIN_KN = 0.1;
/** About 1 knot. At or above this, speed over ground still shows way on. */
const UNDERWAY_SOG_KN = 1;
/** How long a real log reading is kept across interspersed zeros. */
const STW_HOLD_MS = 8_000;

function createPolarRecorder() {
  return {
    samples: [],
    seenTrue: false,
    seenApparent: false,
    stwHoldKn: null,
    stwHoldAt: 0,
  };
}

function recordPolar(recorder, reading, now) {
  const speed = selectSpeed(recorder, reading, now);
  const wind = selectWind(recorder, reading, now);
  if (!speed || !wind) return false;
  const last = recorder.samples[recorder.samples.length - 1];
  if (last && now - last.t < POLAR_MIN_GAP_MS) return false;
  recorder.samples.push({
    t: now,
    speedKn: round2(speed.speedKn),
    speedSource: speed.speedSource,
    twsKn: round2(wind.twsKn),
    twaDeg: round1(wind.twaDeg),
  });
  prunePolar(recorder, now);
  return true;
}

function samplesSince(recorder, since) {
  const from = Number(since);
  if (!Number.isFinite(from) || from <= 0) return recorder.samples;
  return recorder.samples.filter((sample) => sample.t > from);
}

function prunePolar(recorder, now) {
  const cutoff = now - POLAR_RETAIN_MS;
  if (!recorder.samples.length || recorder.samples[0].t >= cutoff) return;
  recorder.samples = recorder.samples.filter((sample) => sample.t >= cutoff);
}

function exportPolar(recorder) {
  return { samples: recorder.samples };
}

function importPolar(saved, now = Date.now()) {
  const recorder = createPolarRecorder();
  const rows = Array.isArray(saved?.samples) ? saved.samples : [];
  recorder.samples = rows.filter(isSample).sort((a, b) => a.t - b.t);
  prunePolar(recorder, now);
  return recorder;
}

function selectSpeed(recorder, reading, now) {
  const stwFresh = fresh(reading, 'stw', now) && reading.stwKn != null;
  const sogFresh = fresh(reading, 'sog', now) && reading.sogKn != null;
  if (stwFresh && Math.abs(reading.stwKn) >= STW_MIN_KN) {
    recorder.stwHoldKn = reading.stwKn;
    recorder.stwHoldAt = now;
    return { speedKn: reading.stwKn, speedSource: 'stw' };
  }
  const held = recorder.stwHoldKn != null
    && now - recorder.stwHoldAt <= STW_HOLD_MS
    && Math.abs(recorder.stwHoldKn) >= STW_MIN_KN;
  const underway = sogFresh && Math.abs(reading.sogKn) >= UNDERWAY_SOG_KN;
  if (stwFresh && held && underway) {
    return { speedKn: recorder.stwHoldKn, speedSource: 'stw' };
  }
  if (sogFresh) return { speedKn: reading.sogKn, speedSource: 'sog' };
  if (stwFresh) return { speedKn: reading.stwKn, speedSource: 'stw' };
  return null;
}

function selectWind(recorder, reading, now) {
  const trueAngle = fresh(reading, 'twa', now) && fresh(reading, 'tws', now)
    && reading.twaDeg != null && reading.twsKn != null;
  const compass = fresh(reading, 'twd', now) && fresh(reading, 'heading', now) && fresh(reading, 'tws', now)
    && reading.twdDeg != null && reading.headingTrueDeg != null && reading.twsKn != null;
  const apparent = fresh(reading, 'awa', now) && fresh(reading, 'aws', now)
    && reading.awaDeg != null && reading.awsKn != null;
  if (trueAngle || compass) recorder.seenTrue = true;
  else if (apparent) recorder.seenApparent = true;

  if (recorder.seenTrue) {
    if (trueAngle) return { twaDeg: fold180(reading.twaDeg), twsKn: reading.twsKn };
    if (compass) return { twaDeg: offBow(reading.twdDeg, reading.headingTrueDeg), twsKn: reading.twsKn };
    return null;
  }
  if (recorder.seenApparent && apparent) {
    return { twaDeg: fold180(reading.awaDeg), twsKn: reading.awsKn };
  }
  return null;
}

function fresh(reading, key, now) {
  const seen = reading?.seen?.[key];
  return seen != null && now - seen <= POLAR_FRESH_MS;
}

function offBow(directionDeg, headingDeg) {
  const relative = ((directionDeg - headingDeg) % 360 + 360) % 360;
  return relative > 180 ? 360 - relative : relative;
}

function fold180(deg) {
  const abs = Math.abs(deg % 360);
  return abs > 180 ? 360 - abs : abs;
}

function isSample(sample) {
  return !!sample
    && Number.isFinite(sample.t)
    && Number.isFinite(sample.speedKn)
    && (sample.speedSource === 'stw' || sample.speedSource === 'sog')
    && Number.isFinite(sample.twsKn)
    && Number.isFinite(sample.twaDeg);
}

function round1(value) {
  return Math.round(value * 10) / 10;
}

function round2(value) {
  return Math.round(value * 100) / 100;
}

module.exports = {
  POLAR_FRESH_MS,
  POLAR_MIN_GAP_MS,
  POLAR_RETAIN_MS,
  POLAR_SAMPLE_MS,
  STW_HOLD_MS,
  createPolarRecorder,
  exportPolar,
  importPolar,
  recordPolar,
  samplesSince,
};
