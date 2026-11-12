const test = require('node:test');
const assert = require('node:assert/strict');
const { watchAssignee } = require('../lib/duty');

const rota = {
  startAt: '2026-11-12T12:00',
  crew: [
    { id: 'sam', name: 'Sam' },
    { id: 'blank', name: ' ' },
    { id: 'jo', name: 'Jo' },
  ],
  tasks: [
    { id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['sam', 'blank', 'jo'] },
  ],
};

const start = Date.parse('2026-11-12T12:00:00Z');
const hour = 60 * 60 * 1000;

test('the watch task names whoever holds the current slot', () => {
  assert.equal(watchAssignee(rota, start), 'Sam');
  assert.equal(watchAssignee(rota, start + 5 * hour), 'Jo');
  assert.equal(watchAssignee(rota, start + 4 * hour), 'Jo');
  assert.equal(watchAssignee(rota, start + 8 * hour), 'Sam');
});

test('a daily watch changes at midnight', () => {
  const daily = {
    ...rota,
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 24, sequence: ['sam', 'jo'] }],
  };
  assert.equal(watchAssignee(daily, start + 20 * hour), 'Jo');
  assert.equal(watchAssignee(daily, start), 'Sam');
});

test('nobody is on watch before the rota starts or without a sequence', () => {
  assert.equal(watchAssignee(rota, start - hour), '');
  assert.equal(watchAssignee({ ...rota, tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: [] }] }, start), '');
  assert.equal(watchAssignee(null, start), '');
});
