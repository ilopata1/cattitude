const test = require('node:test');
const assert = require('node:assert/strict');
const { createReading } = require('../lib/ingest');
const {
  POLAR_FRESH_MS,
  POLAR_RETAIN_MS,
  STW_HOLD_MS,
  createPolarRecorder,
  exportPolar,
  importPolar,
  recordPolar,
  samplesSince,
} = require('../lib/polar');

function readingAt(now, fields, seen = {}) {
  const reading = createReading();
  Object.assign(reading, fields);
  const keys = seenKeys(fields, seen);
  for (const key of keys) reading.seen[key] = seen[key] ?? now;
  return reading;
}

function seenKeys(fields, seen) {
  const keys = new Set(Object.keys(seen));
  if (fields.stwKn != null) keys.add('stw');
  if (fields.sogKn != null) keys.add('sog');
  if (fields.twaDeg != null) keys.add('twa');
  if (fields.twsKn != null) keys.add('tws');
  if (fields.twdDeg != null) keys.add('twd');
  if (fields.headingTrueDeg != null) keys.add('heading');
  if (fields.awaDeg != null) keys.add('awa');
  if (fields.awsKn != null) keys.add('aws');
  return keys;
}

test('a fresh true-wind reading is stored once a second and folded off the bow', () => {
  const recorder = createPolarRecorder();
  const now = 1_000_000;
  const port = readingAt(now, { stwKn: 8.25, twaDeg: -42.2, twsKn: 12.4 });
  assert.equal(recordPolar(recorder, port, now), true);
  assert.equal(recordPolar(recorder, port, now + 100), false);
  const starboard = readingAt(now + 1_000, { stwKn: 8.25, twaDeg: 42.2, twsKn: 12.4 });
  assert.equal(recordPolar(recorder, starboard, now + 1_000), true);
  assert.equal(recorder.samples.length, 2);
  assert.equal(recorder.samples[0].twaDeg, 42.2);
  assert.equal(recorder.samples[1].twaDeg, 42.2);
  assert.equal(recorder.samples[0].speedSource, 'stw');
  assert.equal(recorder.samples[0].speedKn, 8.25);
});

test('true wind from a compass direction uses heading', () => {
  const recorder = createPolarRecorder();
  const now = 2_000_000;
  const reading = readingAt(now, { sogKn: 6, twdDeg: 90, headingTrueDeg: 40, twsKn: 10 });
  assert.equal(recordPolar(recorder, reading, now), true);
  assert.equal(recorder.samples[0].twaDeg, 50);
  assert.equal(recorder.samples[0].speedSource, 'sog');
});

test('apparent wind is used only until true wind has been seen', () => {
  const recorder = createPolarRecorder();
  const now = 3_000_000;
  const apparent = readingAt(now, { sogKn: 5, awaDeg: -30, awsKn: 8 });
  assert.equal(recordPolar(recorder, apparent, now), true);
  assert.equal(recorder.samples[0].twaDeg, 30);
  assert.equal(recorder.samples[0].twsKn, 8);

  const truth = readingAt(now + 1_000, { sogKn: 5, twaDeg: 60, twsKn: 11 });
  assert.equal(recordPolar(recorder, truth, now + 1_000), true);
  const apparentAgain = readingAt(now + 2_000, { sogKn: 5, awaDeg: 10, awsKn: 4 });
  assert.equal(recordPolar(recorder, apparentAgain, now + 2_000), false);
  assert.equal(recorder.samples.length, 2);
});

test('a stale wind reading leaves a gap instead of inventing a sample', () => {
  const recorder = createPolarRecorder();
  const now = 4_000_000;
  const reading = readingAt(now, { stwKn: 7, twaDeg: 50, twsKn: 12 });
  assert.equal(recordPolar(recorder, reading, now), true);
  assert.equal(recordPolar(recorder, reading, now + POLAR_FRESH_MS + 1), false);
  assert.equal(recorder.samples.length, 1);
});

test('an interspersed log zero keeps the last real speed through water', () => {
  const recorder = createPolarRecorder();
  const now = 5_000_000;
  assert.equal(recordPolar(recorder, readingAt(now, { stwKn: 6.5, sogKn: 6.2, twaDeg: 70, twsKn: 14 }), now), true);
  const zero = readingAt(now + 1_000, { stwKn: 0, sogKn: 6.2, twaDeg: 70, twsKn: 14 });
  assert.equal(recordPolar(recorder, zero, now + 1_000), true);
  assert.equal(recorder.samples[1].speedKn, 6.5);
  assert.equal(recorder.samples[1].speedSource, 'stw');

  const dead = readingAt(now + STW_HOLD_MS + 1_000, { stwKn: 0, sogKn: 6.2, twaDeg: 70, twsKn: 14 });
  assert.equal(recordPolar(recorder, dead, now + STW_HOLD_MS + 1_000), true);
  assert.equal(recorder.samples[2].speedSource, 'sog');
  assert.equal(recorder.samples[2].speedKn, 6.2);
});

test('history keeps an hour and can be read from a timestamp', () => {
  const recorder = createPolarRecorder();
  const now = 10_000_000;
  const old = now - POLAR_RETAIN_MS - 5_000;
  assert.equal(recordPolar(recorder, readingAt(old, { stwKn: 5, twaDeg: 80, twsKn: 10 }), old), true);
  assert.equal(recordPolar(recorder, readingAt(now, { stwKn: 5, twaDeg: 80, twsKn: 10 }), now), true);
  assert.equal(recorder.samples.length, 1);
  assert.equal(recorder.samples[0].t, now);
  assert.equal(samplesSince(recorder, now - 1).length, 1);
  assert.equal(samplesSince(recorder, now).length, 0);

  const restored = importPolar(exportPolar(recorder), now);
  assert.equal(restored.samples.length, 1);
  assert.equal(restored.samples[0].speedKn, 5);
  assert.equal(importPolar({ samples: [{ t: 1 }] }, now).samples.length, 0);
});
