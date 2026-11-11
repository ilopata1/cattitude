import { walkItemIds, WALK_AROUND, WALK_AROUND_WARNING } from './walk-around';
import {
  clearDay,
  dayHasContent,
  emptyDay,
  inspectionProgress,
  mergeInspectionDays,
  sanitizeDay,
} from './inspection';

export function inspectionFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const ids = walkItemIds();
  expect(WALK_AROUND.length === 7, 'the walk-around has seven sections');
  expect(new Set(ids).size === ids.length, 'every check has its own id');
  expect(ids.every((id) => /^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id)), 'check ids stay stable keys');
  expect(WALK_AROUND_WARNING.includes('unsafe'), 'the warning stays with the list');
  expect(WALK_AROUND[0].items[0].id === 'before-tell', 'the first check is telling the watchkeeper');

  const day = emptyDay('2026-11-12');
  day.marks['before-tell'] = { done: true, note: 'Told Sam' };
  day.marks['before-clip'] = { done: false, note: 'Port jackline stiff' };
  const progress = inspectionProgress(day, ids);
  expect(progress.done === 1 && progress.total === ids.length, 'progress counts ticked items, not notes');
  expect(dayHasContent(day), 'a note counts as content worth keeping');

  const cleared = clearDay(day, '2026-11-12T13:00:00.000Z');
  expect(!dayHasContent(cleared) && cleared.date === day.date, 'clear wipes ticks and notes for that day only');
  expect(day.marks['before-tell'].note === 'Told Sam', 'clearing returns a new day and leaves the old one');

  const messy = sanitizeDay({
    date: '2026-11-12',
    updatedAt: '2026-11-12T12:00:00.000Z',
    marks: {
      'before-tell': { done: true, note: `  ${'x'.repeat(800)}` },
      'Nope': { done: true, note: 'no' },
      'before-clip': { done: false, note: '   ' },
    },
  });
  expect(messy?.marks['before-tell'].note.length === 500, 'a note is capped');
  expect(!messy?.marks['before-clip'] && !messy?.marks['Nope'], 'empty notes and illegal ids are dropped');
  expect(sanitizeDay({ date: '12 Nov', marks: {} }) == null, 'a day needs a calendar date');

  const local = [
    { date: '2026-11-11', marks: { 'before-tell': { done: true, note: 'local' } }, updatedAt: '2026-11-11T10:00:00.000Z' },
    { date: '2026-11-12', marks: { 'before-tell': { done: true, note: 'phone' } }, updatedAt: '2026-11-12T09:00:00.000Z' },
  ];
  const remote = [
    { date: '2026-11-11', marks: { 'before-tell': { done: true, note: 'server' } }, updatedAt: '2026-11-11T18:00:00.000Z' },
    { date: '2026-11-12', marks: { 'before-tell': { done: false, note: 'other phone' } }, updatedAt: '2026-11-12T11:00:00.000Z' },
    { date: '2026-11-10', marks: { 'crew-log': { done: true, note: '' } }, updatedAt: '2026-11-10T12:00:00.000Z' },
  ];
  const merged = mergeInspectionDays(local, remote, new Set(['2026-11-12']));
  const byDate = new Map(merged.map((item) => [item.date, item]));
  expect(byDate.get('2026-11-12')?.marks['before-tell'].note === 'phone', 'a day still being edited stays on this phone');
  expect(byDate.get('2026-11-11')?.marks['before-tell'].note === 'server', 'a clean day takes the newer copy');
  expect(byDate.get('2026-11-10')?.marks['crew-log'].done === true, 'a day this phone has never seen is kept');
  expect(merged.map((item) => item.date).join(',') === '2026-11-10,2026-11-11,2026-11-12', 'days stay in date order');
  return failures;
}
