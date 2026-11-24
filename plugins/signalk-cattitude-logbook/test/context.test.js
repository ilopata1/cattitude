const test = require('node:test');
const assert = require('node:assert/strict');
const { emptyRevs, mergeContext } = require('../lib/context');
const { normalizeSettings } = require('../lib/math');

function boat(extra = {}) {
  return {
    settings: normalizeSettings(null),
    passage: null,
    sails: { main: '', headsail: '', label: '', recommended: null },
    rota: null,
    wallOffsetMs: 0,
    revs: emptyRevs(),
    sailDirtyAt: null,
    ...extra,
  };
}

const passage = { id: 'p1', name: 'Hope Town', watch: '', waypoints: [] };

test('a change sent from the current revision is taken and bumps it', () => {
  const { state, conflicts, changed } = mergeContext(boat(), { passage, baseRevs: { passage: 0 } }, 1);
  assert.deepEqual(conflicts, []);
  assert.equal(changed, true);
  assert.equal(state.passage.id, 'p1');
  assert.equal(state.revs.passage, 1);
});

test('a phone holding an older passage cannot undo the boat departure', () => {
  const departed = { ...passage, departedAt: '2026-11-24T10:00:00Z' };
  const current = boat({ passage: departed, revs: { ...emptyRevs(), passage: 3 } });
  const { state, conflicts } = mergeContext(current, { passage, baseRevs: { passage: 2 } }, 1);
  assert.deepEqual(conflicts, ['passage']);
  assert.equal(state.passage.departedAt, '2026-11-24T10:00:00Z');
  assert.equal(state.revs.passage, 3);
});

test('a refused part does not block the parts that are current', () => {
  const current = boat({ revs: { ...emptyRevs(), passage: 3 } });
  const sails = { main: 'Reef 1', headsail: 'Genoa' };
  const { state, conflicts } = mergeContext(current, {
    passage,
    sails,
    baseRevs: { passage: 1, sails: 0 },
  }, 5);
  assert.deepEqual(conflicts, ['passage']);
  assert.equal(state.sails.label, 'Reef 1 + Genoa');
  assert.equal(state.sailDirtyAt, 5);
  assert.equal(state.revs.sails, 1);
});

test('sending the same thing again changes nothing', () => {
  const first = mergeContext(boat(), { passage, baseRevs: { passage: 0 } }, 1).state;
  const again = mergeContext(first, { passage, baseRevs: { passage: 1 } }, 2);
  assert.equal(again.changed, false);
  assert.equal(again.state.revs.passage, 1);
});

test('the boat keeps its own watch name for the same passage', () => {
  const current = boat({ passage: { ...passage, watch: 'Sam' }, revs: { ...emptyRevs(), passage: 1 } });
  const { state } = mergeContext(current, { passage: { ...passage, watch: 'Jo' }, baseRevs: { passage: 1 } }, 1);
  assert.equal(state.passage.watch, 'Sam');
});

test('an older app without revisions is still taken, and a null passage from it is ignored', () => {
  const current = boat({ passage, revs: { ...emptyRevs(), passage: 4 } });
  assert.equal(mergeContext(current, { passage: null }, 1).state.passage.id, 'p1');
  const moved = mergeContext(current, { passage: { ...passage, name: 'Marsh Harbour' } }, 1).state;
  assert.equal(moved.passage.name, 'Marsh Harbour');
  assert.equal(moved.revs.passage, 5);
});

test('a phone can end the passage when it sends from the current revision', () => {
  const current = boat({ passage, revs: { ...emptyRevs(), passage: 4 } });
  const { state } = mergeContext(current, { passage: null, baseRevs: { passage: 4 } }, 1);
  assert.equal(state.passage, null);
  assert.equal(state.revs.passage, 5);
});
