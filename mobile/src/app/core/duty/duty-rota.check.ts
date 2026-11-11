import { parseWall } from '../wall-time';
import {
  assigneeAt,
  defaultDutyRota,
  dutySlots,
  formatSlotWhen,
  namedCrew,
  nearestInterval,
  preferRota,
  rosterWindow,
  sanitizeRota,
} from './duty-rota';

export function dutyRotaFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const fresh = defaultDutyRota();
  expect(
    fresh.tasks.map((task) => `${task.id}:${task.intervalHours}`).join(',')
      === 'watch:4,cooking:24,inspection:24,cleaning:24',
    'default tasks are watch every 4 hours and the other three daily',
  );
  expect(nearestInterval(5) === 4, 'an off-list interval snaps to the nearer allowed length');
  expect(nearestInterval(24) === 24, 'daily stays daily');

  const start = '2026-11-12T12:00';
  const startMs = parseWall(start)!;
  const rota = sanitizeRota({
    startAt: start,
    crew: [
      { id: 'sam', name: ' Sam ' },
      { id: 'blank', name: '  ' },
      { id: 'jo', name: 'Jo' },
    ],
    tasks: [
      { id: 'watch', name: 'Watch', intervalHours: 4 },
      { id: 'cooking', name: 'Cooking', intervalHours: 24 },
      { id: 'watch', name: 'Duplicate', intervalHours: 2 },
    ],
    updatedAt: '2026-11-12T12:00:00.000Z',
  });
  expect(rota.crew.map((person) => person.name).join(',') === 'Sam,,Jo', 'names are trimmed and a blank row is kept so it can be filled in');
  expect(namedCrew(rota).map((person) => person.name).join(',') === 'Sam,Jo', 'a blank name does not take a turn');
  expect(rota.tasks.length === 2 && rota.tasks[0].id === 'watch', 'a repeated task id is kept once');

  const hour = 60 * 60 * 1000;
  const watches = dutySlots(rota, startMs, startMs + 12 * hour, null).filter((slot) => slot.taskId === 'watch');
  expect(watches.map((slot) => slot.crewName).join(',') === 'Sam,Jo,Sam', 'watch alternates from the first named person');
  expect(watches[0].endMs - watches[0].startMs === 4 * hour, 'a watch is four hours');
  expect(
    formatSlotWhen(watches[0].startMs, watches[0].endMs) === '12:00–16:00',
    'a watch on one day shows both clock times',
  );

  const jo = dutySlots(rota, startMs, startMs + 12 * hour, 'jo').filter((slot) => slot.taskId === 'watch');
  expect(jo.length === 1 && jo[0].startMs === startMs + 4 * hour, 'a person filter keeps only that person');

  const cooking = dutySlots(rota, startMs, startMs + 48 * hour).filter((slot) => slot.taskId === 'cooking');
  expect(
    cooking.map((slot) => slot.crewName).join(',') === 'Sam,Jo',
    'a daily task changes at the start clock time',
  );
  expect(
    formatSlotWhen(cooking[0].startMs, cooking[0].endMs) === '12:00 – Fri 12:00',
    'a daily slot names the weekday it ends',
  );

  expect(dutySlots({ ...rota, crew: [] }, startMs, startMs + hour).length === 0, 'no named crew produces no slots');
  expect(assigneeAt(rota, 'inspection', startMs + hour) === null, 'a missing task has no assignee');
  expect(assigneeAt(rota, 'watch', startMs + 5 * hour) === 'Jo', 'the assignee is whoever holds the slot');
  expect(assigneeAt(rota, 'watch', startMs + 4 * hour) === 'Jo', 'a slot boundary belongs to the next person');

  const renamed = { ...rota, tasks: rota.tasks.map((task) => task.id === 'watch' ? { ...task, name: 'Helm' } : task) };
  expect(dutySlots(renamed, startMs, startMs + hour)[0].taskName === 'Helm', 'renaming a task keeps its rotation');

  const now = parseWall('2026-11-14T15:00')!;
  const window = rosterWindow(rota, now, 0, 2);
  expect(window.canGoEarlier, 'a trip that has already started can scroll back to the start');
  expect(window.days[0]?.key === '2026-11-14', 'the roster opens on today');
  expect(window.days.every((day) => day.rows.length > 0), 'empty days are left out');

  const opening = rosterWindow(rota, startMs + 3 * hour, 0, 1);
  expect(opening.columns.map((column) => column.name).join(',') === 'Watch,Cooking', 'each task is a column');
  expect(opening.days[0]?.rows[0]?.when === '12:00–16:00', 'the first row is the opening watch');
  expect(opening.days[0]?.rows[0]?.cells.join('|') === 'Sam|Sam', 'the first row names every task');
  expect(opening.days[0]?.rows[1]?.cells.join('|') === 'Jo|', 'a task that keeps its person leaves a blank cell');
  expect(opening.days[0]?.rows[2]?.cells.join('|') === 'Sam|', 'the watch names the person again when it changes back');
  const joOnly = rosterWindow(rota, startMs + 3 * hour, 0, 1, 'jo');
  expect(joOnly.days[0]?.rows.length === 1 && joOnly.days[0]?.rows[0]?.cells.join('|') === 'Jo|', 'one person sees only the rows they hold');

  const local = { ...rota, updatedAt: '2026-11-12T18:00:00.000Z' };
  const remote = { ...rota, updatedAt: '2026-11-13T08:00:00.000Z', crew: [{ id: 'sam', name: 'Sam' }] };
  expect(preferRota(local, remote, true).crew.length === 3, 'an unsynced edit beats a newer server copy');
  expect(preferRota(local, remote, false).crew.length === 1, 'a clean older copy takes the newer server rota');
  expect(preferRota(defaultDutyRota(), remote, false).updatedAt === remote.updatedAt, 'an untouched rota takes the server copy');

  expect(sanitizeRota({ startAt: 'not-a-date', tasks: fresh.tasks }).startAt === '', 'a bad start is cleared');
  return failures;
}
