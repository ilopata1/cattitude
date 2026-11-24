const test = require('node:test');
const assert = require('node:assert/strict');
const { exportTrack, importTrack, trackSince } = require('../lib/track');
const { houseBatteryAlarm } = require('../lib/alarms');
const { createReading, ingest } = require('../lib/ingest');
const { emptyRevs, mergeContext } = require('../lib/context');

const sample = (at, lat) => ({ at, lat, lon: -77, twsKn: 10, pressureHpa: null, tripLogM: 5, sogKn: 6 });

test('track survives a save and load, and drops samples past 48 h', () => {
  const now = 200 * 3_600_000;
  const saved = exportTrack([sample(now - 50 * 3_600_000, 1), sample(now - 3_600_000, 26.5)]);
  const loaded = importTrack(JSON.parse(JSON.stringify(saved)), now - 48 * 3_600_000);
  assert.equal(loaded.length, 1);
  assert.equal(loaded[0].lat, 26.5);
  assert.equal(loaded[0].pressureHpa, null);
  assert.deepEqual(importTrack({ nonsense: true }, 0), []);
});

test('track since a time can be thinned to one sample per step', () => {
  const samples = Array.from({ length: 60 }, (_, i) => sample(i * 10_000, i));
  assert.equal(trackSince(samples, 290_000).length, 30);
  const thinned = trackSince(samples, -1, 60_000);
  assert.equal(thinned.length, 10);
  assert.equal(thinned[1].at - thinned[0].at, 60_000);
});

test('house battery alarm follows battery 0 and the shared limit', () => {
  const reading = createReading();
  assert.equal(houseBatteryAlarm(reading, { houseBatteryPercent: 30 }), null);
  ingest(reading, 'electrical.batteries.0.capacity.stateOfCharge', 0.25, 1);
  assert.equal(houseBatteryAlarm(reading, { houseBatteryPercent: 30 }).state, 'alarm');
  assert.equal(houseBatteryAlarm(reading, { houseBatteryPercent: 20 }).state, 'normal');
  assert.match(houseBatteryAlarm(reading, null).message, /set for 30%/);
});

test('alert settings are versioned like the rest of the context', () => {
  const state = { revs: emptyRevs(), sails: {}, alerts: { houseBatteryPercent: 30 } };
  const taken = mergeContext(state, { alerts: { houseBatteryPercent: 40 }, baseRevs: { alerts: 0 } }, 1);
  assert.equal(taken.state.alerts.houseBatteryPercent, 40);
  assert.equal(taken.state.revs.alerts, 1);
  const stale = mergeContext(taken.state, { alerts: { houseBatteryPercent: 25 }, baseRevs: { alerts: 0 } }, 2);
  assert.deepEqual(stale.conflicts, ['alerts']);
  assert.equal(stale.state.alerts.houseBatteryPercent, 40);
});
