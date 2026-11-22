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
  overlapHint,
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
  expect(fresh.tasks.every((task) => task.offsetHours == null), 'overlap is off until someone sets it');

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

  const overlap = sanitizeRota({
    startAt: start,
    crew: [
      { id: 'sam', name: 'Sam' },
      { id: 'jo', name: 'Jo' },
      { id: 'alex', name: 'Alex' },
    ],
    tasks: [
      { id: 'watch', name: 'Watch', intervalHours: 4, offsetHours: 2, sequence: ['sam', 'jo', 'alex'] },
      { id: 'cooking', name: 'Cooking', intervalHours: 24, sequence: ['sam'] },
    ],
  });
  expect(overlap.tasks[0].offsetHours === 2, 'an offset shorter than the turn is kept');
  expect(
    sanitizeRota({
      tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, offsetHours: 4 }],
    }).tasks[0].offsetHours == null,
    'an offset that does not overlap is cleared',
  );
  expect(
    sanitizeRota({
      tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, offsetHours: 5 }],
    }).tasks[0].offsetHours == null,
    'an offset off the list is cleared',
  );
  const overlapWatches = dutySlots(overlap, startMs, startMs + 8 * hour).filter((slot) => slot.taskId === 'watch');
  expect(
    overlapWatches.map((slot) => `${slot.crewName}@${(slot.startMs - startMs) / hour}`).join(',')
      === 'Alex@-2,Sam@0,Jo@2,Alex@4,Sam@6',
    'each watch starts two hours after the previous person, including the person already on at the start',
  );
  expect(overlapWatches[0].endMs - overlapWatches[0].startMs === 4 * hour, 'an overlapping watch still lasts four hours');
  expect(assigneeAt(overlap, 'watch', startMs + hour) === 'Alex, Sam', 'the first two hours are the person before and the person who just started');
  expect(assigneeAt(overlap, 'watch', startMs + 2 * hour) === 'Sam, Jo', 'a boundary hands the first person off and brings the next person on');
  expect(assigneeAt(overlap, 'watch', startMs + 3 * hour) === 'Sam, Jo', 'the second two hours are with the person after');
  const staggeredDay = sanitizeRota({
    startAt: start,
    crew: overlap.crew,
    tasks: [{ id: 'cooking', name: 'Cooking', intervalHours: 24, offsetHours: 12, sequence: ['sam', 'jo'] }],
  });
  expect(
    assigneeAt(staggeredDay, 'cooking', startMs + hour) === 'Jo, Sam',
    'a daily task can overlap from the trip start',
  );
  const solo = sanitizeRota({
    startAt: start,
    crew: [{ id: 'sam', name: 'Sam' }],
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, offsetHours: 2, sequence: ['sam'] }],
  });
  expect(
    dutySlots(solo, startMs, startMs + 8 * hour).map((slot) => (slot.startMs - startMs) / hour).join(',') === '0,4',
    'one person does not overlap their own watch',
  );
  const overlapRows = rosterWindow(overlap, startMs + hour, 0, 1).days[0]?.rows ?? [];
  expect(
    overlapRows.slice(0, 4).map((row) => `${row.when}|${row.cells.join('|')}`).join(';')
      === '12:00–14:00|Alex, Sam|Sam;14:00–16:00|Sam, Jo|;16:00–18:00|Jo, Alex|;18:00–20:00|Alex, Sam|',
    'each two-hour row names both people on watch, and a daily name appears once',
  );
  const joOverlap = rosterWindow(overlap, startMs + hour, 0, 1, 'jo');
  const joWatch = joOverlap.days[0]?.rows.filter((row) => row.cells[0] === 'Jo') ?? [];
  expect(
    joWatch.slice(0, 2).map((row) => row.when).join(',') === '14:00–16:00,16:00–18:00',
    'one person keeps their name for both halves of an overlapping watch',
  );
  expect(
    overlapHint(4, 2, 4) === 'Two people are on together. Each person spends the first 2 hours with the person before them, and the next 2 hours with the person after them.',
    'a half overlap tells each person who they stand with',
  );
  expect(
    overlapHint(4, 2, 2).endsWith('With 2 people, both stay on watch.'),
    'two people on a half overlap never come off watch',
  );
  expect(
    overlapHint(4, 3, 3) === 'The next person starts 3 hours later. Each person stays for 4 hours. The watches overlap for 1 hour.',
    'an uneven offset says how long the watches overlap',
  );
  const overlapIcs = unfoldIcs(dutyToIcs(sanitizeRota({
    startAt: start,
    crew: overlap.crew,
    tasks: [overlap.tasks[0]],
  }), {
    fromMs: startMs,
    toMs: startMs + 2 * hour,
    remindMinutes: null,
    stampMs: Date.UTC(2026, 10, 12, 18, 0, 0),
  }));
  expect(
    summaries(overlapIcs).join(',') === 'Watch · Alex,Watch · Sam',
    'the opening pair is on the calendar',
  );
  expect(
    overlapIcs.includes('DTSTART:20261112T120000\r\n') && overlapIcs.includes('DTEND:20261112T140000\r\n')
      && !overlapIcs.includes('DTSTART:20261112T100000'),
    'a watch that began before the trip is shown from the trip start',
  );

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
