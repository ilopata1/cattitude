const test = require('node:test');
const assert = require('node:assert/strict');
const { createReading, ingest } = require('../lib/ingest');
const { intervalDue } = require('../lib/math');
const { buildEntry, toLogentryResource } = require('../lib/entry');

test('interval is due on the UTC slot and not again in the same slot', () => {
  const slot = Date.parse('2026-06-01T03:00:00Z');
  assert.equal(intervalDue(slot + 60_000, 0, 3, 0), true);
  assert.equal(intervalDue(slot + 60_000, slot, 3, 0), false);
});

test('an entry keeps depth, tanks, and the Clever Sailor payload', () => {
  const reading = createReading();
  const now = Date.parse('2026-06-01T12:00:00Z');
  ingest(reading, 'navigation.position', { latitude: 26.5, longitude: -77.1 }, now);
  ingest(reading, 'navigation.speedOverGround', 2, now);
  ingest(reading, 'environment.depth.belowSurface', 8.2, now);
  ingest(reading, 'tanks.fuel.main.currentLevel', 0.4, now);
  ingest(reading, 'environment.wind.speedTrue', 6, now);

  const entry = buildEntry({
    reading,
    samples: [],
    passage: null,
    sails: { main: 'Full', headsail: 'Genoa', label: 'Full + Genoa', recommended: null },
    trigger: 'interval',
    remarks: '',
    nowMs: now,
    previous: null,
    recentSog: [],
  });

  assert.equal(entry.depthM, 8.2);
  assert.equal(entry.ship.tanks[0].level, 0.4);
  assert.equal(entry.sails.label, 'Full + Genoa');
  const resource = toLogentryResource(entry);
  assert.equal(resource['x-cattitude'].id, entry.id);
  assert.equal(resource.enrich, false);
  assert.equal(resource.text, 'Interval');
  assert.ok(resource.telemetry.some((item) => item.path === 'environment.depth.belowSurface'));
});
