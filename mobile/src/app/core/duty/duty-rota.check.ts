import { parseWall } from '../wall-time';
import {
  assigneeAt,
  defaultDutyRota,
  dutyCalendarFilename,
  dutySlots,
  dutyToIcs,
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
  expect(rota.tasks[0].sequence.join(',') === 'sam,blank,jo', 'a saved task with no sequence keeps the crew list');
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
    cooking.map((slot) => slot.crewName).join(',') === 'Sam,Jo,Sam',
    'a daily task changes at midnight, after a short first day',
  );
  expect(cooking[0].endMs === startMs + 12 * hour, 'the first daily stretch ends at the next midnight');
  expect(cooking[1].startMs === cooking[0].endMs && cooking[1].endMs - cooking[1].startMs === 24 * hour, 'later daily tasks are full calendar days');
  expect(assigneeAt(rota, 'cooking', startMs + 20 * hour) === 'Jo', 'after midnight the next person has the daily job');
  const midnightStart = sanitizeRota({ ...rota, startAt: '2026-11-12T00:00' });
  const midnightMs = parseWall('2026-11-12T00:00')!;
  const fullDays = dutySlots(midnightStart, midnightMs, midnightMs + 36 * hour).filter((slot) => slot.taskId === 'cooking');
  expect(fullDays[0].endMs - fullDays[0].startMs === 24 * hour && fullDays[0].crewName === 'Sam', 'a midnight start gives the first person a full day');

  expect(dutySlots({ ...rota, crew: [] }, startMs, startMs + hour).length === 0, 'no named crew produces no slots');
  expect(assigneeAt(rota, 'inspection', startMs + hour) === null, 'a missing task has no assignee');
  expect(assigneeAt(rota, 'watch', startMs + 5 * hour) === 'Jo', 'the assignee is whoever holds the slot');
  expect(assigneeAt(rota, 'watch', startMs + 4 * hour) === 'Jo', 'a slot boundary belongs to the next person');

  const custom = sanitizeRota({
    ...rota,
    tasks: [
      { id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['jo', 'sam'] },
      { id: 'cooking', name: 'Cooking', intervalHours: 24, sequence: ['sam'] },
    ],
  });
  const customWatches = dutySlots(custom, startMs, startMs + 12 * hour).filter((slot) => slot.taskId === 'watch');
  expect(customWatches.map((slot) => slot.crewName).join(',') === 'Jo,Sam,Jo', 'a task follows its own sequence');
  const customCooking = dutySlots(custom, startMs, startMs + 48 * hour).filter((slot) => slot.taskId === 'cooking');
  expect(customCooking.every((slot) => slot.crewName === 'Sam'), 'another task can keep a different order');
  expect(
    sanitizeRota({
      ...rota,
      tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['jo', 'nope', 'jo'] }],
    }).tasks[0].sequence.join(',') === 'jo,jo',
    'a sequence can repeat a person and drops anyone not on the crew list',
  );
  const nobody = sanitizeRota({
    ...rota,
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: [] }],
  });
  expect(dutySlots(nobody, startMs, startMs + hour).length === 0, 'a task with an empty sequence assigns nobody');

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

  const across = rosterWindow(rota, startMs + 3 * hour, 0, 2);
  const nextDay = across.days.find((day) => day.key === '2026-11-13');
  expect(nextDay?.rows[0]?.when === '00:00–04:00', 'each watch keeps its own row after midnight');
  expect(nextDay?.rows[0]?.cells.join('|') === 'Jo|Jo', 'the next daily name appears at midnight');
  expect(
    nextDay?.rows.find((row) => row.when === '12:00–16:00')?.cells.join('|') === 'Sam|',
    'a daily name stays blank for the rest of that calendar day',
  );

  const mixed = sanitizeRota({
    ...rota,
    tasks: [
      { id: 'watch', name: 'Watch', intervalHours: 4 },
      { id: 'cooking', name: 'Cooking', intervalHours: 6 },
    ],
  });
  const mixedRows = rosterWindow(mixed, startMs + hour, 0, 1).days[0]?.rows ?? [];
  expect(
    mixedRows.map((row) => row.when).join(',') === '12:00–16:00,16:00–20:00,20:00–00:00',
    'rows follow the most frequent task',
  );
  expect(mixedRows[2]?.cells.join('|') === 'Sam|Jo', 'a slower task is named on the first watch of its assignment');

  const local = { ...rota, updatedAt: '2026-11-12T18:00:00.000Z' };
  const remote = { ...rota, updatedAt: '2026-11-13T08:00:00.000Z', crew: [{ id: 'sam', name: 'Sam' }] };
  expect(preferRota(local, remote, true).crew.length === 3, 'an unsynced edit beats a newer server copy');
  expect(preferRota(local, remote, false).crew.length === 1, 'a clean older copy takes the newer server rota');
  expect(preferRota(defaultDutyRota(), remote, false).updatedAt === remote.updatedAt, 'an untouched rota takes the server copy');

  expect(sanitizeRota({ startAt: 'not-a-date', tasks: fresh.tasks }).startAt === '', 'a bad start is cleared');

  const stampMs = Date.UTC(2026, 10, 12, 18, 0, 0);
  const ics = unfoldIcs(dutyToIcs(rota, {
    fromMs: startMs,
    toMs: startMs + 12 * hour,
    remindMinutes: 15,
    stampMs,
  }));
  expect(ics.startsWith('BEGIN:VCALENDAR\r\n') && ics.endsWith('END:VCALENDAR\r\n'), 'the download is a calendar file');
  expect(ics.includes('NAME:Duty rota\r\n'), 'everyone shares one calendar name');
  expect(ics.includes('DTSTAMP:20261112T180000Z'), 'the stamp is an actual UTC instant');
  expect(
    ics.includes('DTSTART:20261112T120000\r\n') && !ics.includes('DTSTART:20261112T120000Z'),
    'event times stay on the boat clock',
  );
  expect(ics.includes('DTEND:20261112T160000\r\n'), 'a watch ends four hours later');
  expect(ics.includes('DTEND:20261113T000000\r\n'), 'the first daily job ends at the next midnight');
  expect(
    summaries(ics).join(',') === 'Watch · Sam,Cooking · Sam,Watch · Jo,Watch · Sam',
    'everyone gets each assignment, in roster order',
  );
  expect(ics.includes('TRIGGER:-PT15M') && ics.includes('DESCRIPTION:Watch for Sam starts in 15 minutes'), 'the reminder fires that many minutes before the start');

  const joIcs = unfoldIcs(dutyToIcs(rota, {
    fromMs: startMs,
    toMs: startMs + 12 * hour,
    crewId: 'jo',
    remindMinutes: null,
    stampMs,
  }));
  expect(summaries(joIcs).join(',') === 'Watch · Jo', 'one person gets only their duties');
  expect(joIcs.includes('NAME:Duty rota — Jo'), 'a personal file is named for that person');
  expect(!joIcs.includes('BEGIN:VALARM'), 'turning the reminder off leaves it out of the file');
  expect(dutyCalendarFilename(rota, null) === 'duty-rota.ics', 'everyone downloads duty-rota.ics');
  expect(dutyCalendarFilename(rota, 'jo') === 'duty-jo.ics', 'one person downloads a file named for them');

  const joLater = unfoldIcs(dutyToIcs(rota, {
    fromMs: startMs,
    toMs: startMs + 48 * hour,
    crewId: 'jo',
    remindMinutes: 30,
    stampMs,
  }));
  expect(summaries(joLater).includes('Cooking · Jo'), 'a longer window still keeps only that person');
  expect(joLater.includes('TRIGGER:-PT30M'), 'their reminder uses the minutes they set');

  const comma = sanitizeRota({
    startAt: start,
    crew: [
      { id: 'sam', name: 'Sam, Jr' },
      { id: 'jo', name: 'Jo' },
    ],
    tasks: [{ id: 'watch', name: 'Watch; helm', intervalHours: 4 }],
  });
  const commaIcs = unfoldIcs(dutyToIcs(comma, {
    fromMs: startMs,
    toMs: startMs + hour,
    remindMinutes: 0,
    stampMs,
  }));
  expect(commaIcs.includes('SUMMARY:Watch\\; helm · Sam\\, Jr'), 'commas and semicolons in names stay in the text');
  expect(commaIcs.includes('TRIGGER:PT0S'), 'zero minutes reminds at the start');
  expect(
    dutyToIcs(rota, { fromMs: startMs, toMs: startMs + hour, remindMinutes: 100000, stampMs }).includes('TRIGGER:-PT1440M'),
    'a reminder is capped at one day',
  );

  const longName = 'A'.repeat(80);
  const folded = dutyToIcs({
    startAt: start,
    crew: [{ id: 'sam', name: longName }],
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['sam'] }],
    updatedAt: '',
  }, { fromMs: startMs, toMs: startMs + hour, remindMinutes: null, stampMs });
  expect(
    folded.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75),
    'calendar lines stay within 75 bytes',
  );
  expect(unfoldIcs(folded).includes(`SUMMARY:Watch · ${longName}`), 'a folded name is still the whole name');
  const accented = 'é'.repeat(40);
  const accentedIcs = dutyToIcs({
    startAt: start,
    crew: [{ id: 'sam', name: accented }],
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['sam'] }],
    updatedAt: '',
  }, { fromMs: startMs, toMs: startMs + hour, remindMinutes: null, stampMs });
  expect(
    accentedIcs.split('\r\n').every((line) => new TextEncoder().encode(line).length <= 75)
      && unfoldIcs(accentedIcs).includes(`SUMMARY:Watch · ${accented}`),
    'a folded line keeps a multibyte name intact',
  );
  expect(
    !dutyToIcs(defaultDutyRota(), { fromMs: startMs, toMs: startMs + hour, remindMinutes: 15, stampMs }).includes('BEGIN:VEVENT'),
    'an unset rota downloads as an empty calendar',
  );
  return failures;
}

function unfoldIcs(ics: string): string {
  return ics.replace(/\r\n[ \t]/g, '');
}

function summaries(ics: string): string[] {
  return ics
    .split('\r\n')
    .filter((line) => line.startsWith('SUMMARY:'))
    .map((line) => line.slice('SUMMARY:'.length));
}
