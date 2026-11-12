import {
  DAY_MS,
  formatWallDay,
  formatWallTime,
  parseWall,
  startOfWallDay,
  weekdayShort,
} from '../wall-time';

export const DUTY_INTERVAL_HOURS = [2, 3, 4, 6, 8, 12, 24] as const;

export const DUTY_INTERVAL_OPTIONS = DUTY_INTERVAL_HOURS.map((hours) => ({
  hours,
  label: hours === 24 ? 'Daily' : `${hours} hours`,
}));

export interface CrewMember {
  id: string;
  name: string;
}

export interface DutyTask {
  id: string;
  name: string;
  /** Length of one assignment. Daily runs to midnight, then one calendar day each. */
  intervalHours: number;
  /** Crew ids in this task's own order. The same person may appear more than once. */
  sequence: string[];
}

export interface DutyRota {
  /** `YYYY-MM-DDTHH:mm` wall time, or empty until a start is set. */
  startAt: string;
  crew: CrewMember[];
  tasks: DutyTask[];
  updatedAt: string;
}

export interface DutySlot {
  taskId: string;
  taskName: string;
  crewId: string;
  crewName: string;
  startMs: number;
  endMs: number;
}

export interface RosterColumn {
  id: string;
  name: string;
}

export interface RosterGridRow {
  startMs: number;
  when: string;
  /** Parallel to the roster columns. Empty when the person has not changed. */
  cells: string[];
}

export interface RosterDay {
  key: string;
  label: string;
  rows: RosterGridRow[];
}

const ID_RE = /^[a-z0-9][a-z0-9-]{0,39}$/;
const MAX_SLOTS = 2000;

let dutySeq = 0;

export function newDutyId(): string {
  dutySeq += 1;
  return `d${Date.now().toString(36)}${dutySeq.toString(36)}`;
}

export function defaultDutyRota(): DutyRota {
  return {
    startAt: '',
    crew: [],
    tasks: [
      { id: 'watch', name: 'Watch', intervalHours: 4, sequence: [] },
      { id: 'cooking', name: 'Cooking', intervalHours: 24, sequence: [] },
      { id: 'inspection', name: 'Inspection', intervalHours: 24, sequence: [] },
      { id: 'cleaning', name: 'Cleaning', intervalHours: 24, sequence: [] },
    ],
    updatedAt: '',
  };
}

export function nearestInterval(hours: number): number {
  if (!Number.isFinite(hours)) {
    return 4;
  }
  let best: number = DUTY_INTERVAL_HOURS[0];
  let distance = Infinity;
  for (const allowed of DUTY_INTERVAL_HOURS) {
    const gap = Math.abs(allowed - hours);
    if (gap < distance || (gap === distance && allowed < best)) {
      distance = gap;
      best = allowed;
    }
  }
  return best;
}

export function sanitizeRota(raw: unknown): DutyRota {
  const fallback = defaultDutyRota();
  if (!raw || typeof raw !== 'object') {
    return fallback;
  }
  const source = raw as Partial<DutyRota>;
  const crew = sanitizeCrew(source.crew);
  return {
    startAt: normalizeStart(source.startAt),
    crew,
    tasks: sanitizeTasks(source.tasks, crew),
    updatedAt: clipText(source.updatedAt, 40),
  };
}

export function namedCrew(rota: DutyRota): CrewMember[] {
  return rota.crew.filter((person) => person.name.trim().length > 0);
}

/**
 * Assignments that overlap `[fromMs, toMs)`.
 * Slot `i` of a task belongs to that task's sequence at `i % sequence`.
 */
export function dutySlots(
  rota: DutyRota,
  fromMs: number,
  toMs: number,
  crewId?: string | null,
): DutySlot[] {
  const start = parseWall(rota.startAt);
  const people = namedCrew(rota);
  if (start == null || !people.length || !(toMs > fromMs)) {
    return [];
  }
  const byId = new Map(people.map((person) => [person.id, person]));
  const tasks = rota.tasks.filter((task) => task.name.trim());
  const slots: DutySlot[] = [];
  for (const task of tasks) {
    const rotation = taskRotation(task, byId);
    const interval = task.intervalHours * 60 * 60 * 1000;
    if (!rotation.length || interval <= 0 || toMs <= start) {
      continue;
    }
    let index = fromMs > start ? assignmentIndex(start, interval, fromMs) : 0;
    while (slots.length < MAX_SLOTS) {
      const bounds = assignmentBounds(start, interval, index);
      index += 1;
      if (bounds.startMs >= toMs) {
        break;
      }
      if (bounds.endMs <= fromMs) {
        continue;
      }
      const person = rotation[(index - 1) % rotation.length];
      if (crewId && person.id !== crewId) {
        continue;
      }
      slots.push({
        taskId: task.id,
        taskName: task.name.trim(),
        crewId: person.id,
        crewName: person.name.trim(),
        startMs: bounds.startMs,
        endMs: bounds.endMs,
      });
    }
  }
  const order = new Map(tasks.map((task, index) => [task.id, index]));
  slots.sort((a, b) => a.startMs - b.startMs || (order.get(a.taskId) ?? 0) - (order.get(b.taskId) ?? 0));
  return slots;
}

/** Who holds `taskId` (or a task of that name) at a wall time. */
export function assigneeAt(rota: DutyRota, taskId: string, atMs: number): string | null {
  const key = taskId.trim().toLowerCase();
  const task = rota.tasks.find(
    (item) => item.id === taskId || item.name.trim().toLowerCase() === key,
  );
  if (!task) {
    return null;
  }
  const slots = dutySlots({ ...rota, tasks: [task] }, atMs, atMs + 1);
  return slots[0]?.crewName ?? null;
}

export function formatSlotWhen(startMs: number, endMs: number): string {
  const startLabel = formatWallTime(startMs);
  const endLabel = formatWallTime(endMs);
  const sameDay = startOfWallDay(startMs) === startOfWallDay(endMs - 1);
  if (sameDay) {
    return `${startLabel}–${endLabel}`;
  }
  return `${startLabel} – ${weekdayShort(endMs)} ${endLabel}`;
}

/**
 * One row per slot of the most frequent task, counted from the trip start.
 * A cell names the person only on the first of those rows in their assignment,
 * so a daily job is named once and the next name appears the next day.
 * A person filter keeps a row only when they hold at least one task then.
 */
export function rosterGrid(
  rota: DutyRota,
  fromMs: number,
  toMs: number,
  crewId?: string | null,
): { columns: RosterColumn[]; days: RosterDay[] } {
  const tasks = rota.tasks.filter((task) => task.name.trim() && task.intervalHours > 0);
  const columns: RosterColumn[] = tasks.map((task) => ({ id: task.id, name: task.name.trim() }));
  const start = parseWall(rota.startAt);
  if (!columns.length || start == null || !namedCrew(rota).length || !(toMs > fromMs) || toMs <= start) {
    return { columns, days: [] };
  }
  const step = Math.min(...tasks.map((task) => task.intervalHours)) * 60 * 60 * 1000;
  let index = fromMs > start ? assignmentIndex(start, step, fromMs) : 0;
  const priorStart = index > 0 ? assignmentBounds(start, step, index - 1).startMs : start;
  const slots = dutySlots(rota, priorStart, toMs);
  const byTask = new Map<string, DutySlot[]>();
  for (const slot of slots) {
    const list = byTask.get(slot.taskId);
    if (list) {
      list.push(slot);
    } else {
      byTask.set(slot.taskId, [slot]);
    }
  }
  const previous = new Map<string, string>();
  if (index > 0) {
    rememberHolders(columns, byTask, priorStart, crewId, previous);
  }
  const groups = new Map<string, RosterDay>();
  for (; index < MAX_SLOTS; index += 1) {
    const bounds = assignmentBounds(start, step, index);
    if (bounds.startMs >= toMs) {
      break;
    }
    if (bounds.endMs <= fromMs) {
      continue;
    }
    const rowStart = bounds.startMs;
    const rowEnd = bounds.endMs;
    const cells: string[] = [];
    const heldNow = new Map<string, string>();
    let held = false;
    for (const column of columns) {
      const holder = holderAt(byTask.get(column.id) ?? [], rowStart);
      const visible = holder && (!crewId || holder.crewId === crewId) ? holder.crewName : '';
      if (visible) {
        held = true;
      }
      cells.push(visible && visible !== (previous.get(column.id) ?? '') ? visible : '');
      heldNow.set(column.id, visible);
    }
    previous.clear();
    heldNow.forEach((name, id) => previous.set(id, name));
    if (crewId && !held) {
      continue;
    }
    const keyMs = startOfWallDay(rowStart);
    const key = new Date(keyMs).toISOString().slice(0, 10);
    let day = groups.get(key);
    if (!day) {
      day = { key, label: formatWallDay(keyMs), rows: [] };
      groups.set(key, day);
    }
    day.rows.push({
      startMs: rowStart,
      when: formatSlotWhen(rowStart, rowEnd),
      cells,
    });
  }
  return { columns, days: [...groups.values()] };
}

/** The same window the roster shows: from the trip, today, or the scrolled past, through the days ahead. */
export function rosterBounds(
  rota: DutyRota,
  nowMs: number,
  pastDays: number,
  futureDays: number,
): { fromMs: number; toMs: number } | null {
  const start = parseWall(rota.startAt);
  if (start == null) {
    return null;
  }
  const today = startOfWallDay(nowMs);
  const fromFloor = start > today ? start : today - Math.max(0, pastDays) * DAY_MS;
  const fromMs = Math.max(start, fromFloor);
  const toMs = Math.max(today, startOfWallDay(start)) + Math.max(1, futureDays) * DAY_MS;
  return { fromMs, toMs };
}

export function rosterWindow(
  rota: DutyRota,
  nowMs: number,
  pastDays: number,
  futureDays: number,
  crewId?: string | null,
): { columns: RosterColumn[]; days: RosterDay[]; canGoEarlier: boolean } {
  const bounds = rosterBounds(rota, nowMs, pastDays, futureDays);
  if (!bounds) {
    return { columns: [], days: [], canGoEarlier: false };
  }
  const grid = rosterGrid(rota, bounds.fromMs, bounds.toMs, crewId);
  const start = parseWall(rota.startAt) ?? bounds.fromMs;
  return { ...grid, canGoEarlier: bounds.fromMs > start };
}

/** A reminder more than a day ahead is clipped. `null` means no reminder. */
export const DUTY_REMIND_MAX_MINUTES = 24 * 60;

export interface DutyCalendarOptions {
  fromMs: number;
  toMs: number;
  crewId?: string | null;
  /** Minutes before each start. Omit, or pass null, for no reminder. */
  remindMinutes?: number | null;
  /** UTC instant written as `DTSTAMP`. */
  stampMs: number;
}

/**
 * One event per assignment in the window. Times are floating boat-clock times,
 * so a calendar on this phone shows the same hours as the roster.
 * `crewId` keeps one person; omit it for everyone.
 */
export function dutyToIcs(rota: DutyRota, options: DutyCalendarOptions): string {
  const slots = dutySlots(rota, options.fromMs, options.toMs, options.crewId);
  const remind = remindOffset(options.remindMinutes);
  const title = calendarTitle(rota, options.crewId);
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Cattitude//Duty rota//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `NAME:${icsText(title)}`,
    `X-WR-CALNAME:${icsText(title)}`,
  ];
  for (const slot of slots) {
    if (slot.endMs <= slot.startMs) {
      continue;
    }
    lines.push('BEGIN:VEVENT');
    lines.push(`UID:cattitude-duty-${slot.taskId}-${slot.crewId}-${slot.startMs}@cattitude`);
    lines.push(`DTSTAMP:${formatIcsUtc(options.stampMs)}`);
    lines.push(`DTSTART:${formatIcsLocal(slot.startMs)}`);
    lines.push(`DTEND:${formatIcsLocal(slot.endMs)}`);
    lines.push(`SUMMARY:${icsText(`${slot.taskName} · ${slot.crewName}`)}`);
    lines.push(`DESCRIPTION:${icsText(`${slot.taskName} for ${slot.crewName}`)}`);
    if (remind != null) {
      lines.push('BEGIN:VALARM');
      lines.push('ACTION:DISPLAY');
      lines.push(`DESCRIPTION:${icsText(alarmDescription(slot, remind))}`);
      lines.push(`TRIGGER:${remind === 0 ? 'PT0S' : `-PT${remind}M`}`);
      lines.push('END:VALARM');
    }
    lines.push('END:VEVENT');
  }
  lines.push('END:VCALENDAR');
  return `${lines.map(foldIcsLine).join('\r\n')}\r\n`;
}

export function dutyCalendarFilename(rota: DutyRota, crewId?: string | null): string {
  const name = selectedCrewName(rota, crewId);
  if (!name) {
    return 'duty-rota.ics';
  }
  const slug = name
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40);
  return `duty-${slug || 'crew'}.ics`;
}

/**
 * A daily task ends at midnight. The opening stretch may be shorter than a
 * day; every later assignment is one calendar day. Other intervals count
 * forward from the trip start.
 */
function assignmentBounds(startMs: number, intervalMs: number, index: number): { startMs: number; endMs: number } {
  if (intervalMs === DAY_MS) {
    const firstEnd = startMs === startOfWallDay(startMs) ? startMs + DAY_MS : startOfWallDay(startMs) + DAY_MS;
    if (index <= 0) {
      return { startMs, endMs: firstEnd };
    }
    const slotStart = firstEnd + (index - 1) * DAY_MS;
    return { startMs: slotStart, endMs: slotStart + DAY_MS };
  }
  const slotStart = startMs + Math.max(0, index) * intervalMs;
  return { startMs: slotStart, endMs: slotStart + intervalMs };
}

function assignmentIndex(startMs: number, intervalMs: number, atMs: number): number {
  if (atMs <= startMs) {
    return 0;
  }
  if (intervalMs === DAY_MS) {
    const firstEnd = assignmentBounds(startMs, intervalMs, 0).endMs;
    if (atMs < firstEnd) {
      return 0;
    }
    return 1 + Math.floor((atMs - firstEnd) / DAY_MS);
  }
  return Math.floor((atMs - startMs) / intervalMs);
}

function rememberHolders(
  columns: RosterColumn[],
  byTask: Map<string, DutySlot[]>,
  atMs: number,
  crewId: string | null | undefined,
  previous: Map<string, string>,
): void {
  for (const column of columns) {
    const holder = holderAt(byTask.get(column.id) ?? [], atMs);
    previous.set(column.id, holder && (!crewId || holder.crewId === crewId) ? holder.crewName : '');
  }
}

function holderAt(slots: DutySlot[], atMs: number): DutySlot | null {
  for (const slot of slots) {
    if (slot.startMs <= atMs && atMs < slot.endMs) {
      return slot;
    }
  }
  return null;
}

/** Local unsynced edits win. Otherwise the newer `updatedAt` wins. */
export function preferRota(local: DutyRota, remote: DutyRota | null, dirty: boolean): DutyRota {
  if (dirty || !remote) {
    return local;
  }
  if (!local.updatedAt || remote.updatedAt > local.updatedAt) {
    return remote;
  }
  return local;
}

function sanitizeCrew(raw: unknown): CrewMember[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const crew: CrewMember[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 16)) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Partial<CrewMember>;
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!ID_RE.test(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    crew.push({ id, name: clipText(row.name, 60) });
  }
  return crew;
}

function taskRotation(task: DutyTask, byId: Map<string, CrewMember>): CrewMember[] {
  const rotation: CrewMember[] = [];
  for (const id of task.sequence) {
    const person = byId.get(id);
    if (person) {
      rotation.push(person);
    }
  }
  return rotation;
}

function sanitizeTasks(raw: unknown, crew: CrewMember[]): DutyTask[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const known = new Set(crew.map((person) => person.id));
  const tasks: DutyTask[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Partial<DutyTask> & { sequence?: unknown };
    const id = typeof row.id === 'string' ? row.id.trim() : '';
    if (!ID_RE.test(id) || seen.has(id)) {
      continue;
    }
    seen.add(id);
    const hours = typeof row.intervalHours === 'number' ? row.intervalHours : Number(row.intervalHours);
    tasks.push({
      id,
      name: clipText(row.name, 40),
      intervalHours: nearestInterval(hours),
      sequence: sanitizeSequence(row.sequence, known, crew),
    });
  }
  return tasks;
}

/** A missing sequence keeps the old crew-list order. An empty one stays empty. */
function sanitizeSequence(raw: unknown, known: Set<string>, crew: CrewMember[]): string[] {
  if (!Array.isArray(raw)) {
    return crew.map((person) => person.id);
  }
  const sequence: string[] = [];
  for (const item of raw.slice(0, 64)) {
    const id = typeof item === 'string' ? item.trim() : '';
    if (known.has(id)) {
      sequence.push(id);
    }
  }
  return sequence;
}

function normalizeStart(value: unknown): string {
  if (typeof value !== 'string') {
    return '';
  }
  const head = value.trim().slice(0, 16);
  return parseWall(head) != null ? head : '';
}

function clipText(value: unknown, max: number): string {
  return typeof value === 'string' ? value.trim().slice(0, max) : '';
}

function selectedCrewName(rota: DutyRota, crewId?: string | null): string {
  if (!crewId) {
    return '';
  }
  return rota.crew.find((person) => person.id === crewId)?.name.trim() ?? '';
}

function calendarTitle(rota: DutyRota, crewId?: string | null): string {
  const name = selectedCrewName(rota, crewId);
  return name ? `Duty rota — ${name}` : 'Duty rota';
}

function remindOffset(value: number | null | undefined): number | null {
  if (value == null || !Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(DUTY_REMIND_MAX_MINUTES, Math.round(value)));
}

function alarmDescription(slot: DutySlot, minutes: number): string {
  const lead = `${slot.taskName} for ${slot.crewName}`;
  if (minutes <= 0) {
    return `${lead} starts now`;
  }
  if (minutes === 1) {
    return `${lead} starts in 1 minute`;
  }
  return `${lead} starts in ${minutes} minutes`;
}

function icsText(value: string): string {
  return value
    .replace(/\\/g, '\\\\')
    .replace(/\r\n|\n|\r/g, '\\n')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,');
}

/** Fold at 75 octets. A continuation line starts with a space, which counts. */
function foldIcsLine(line: string): string {
  const bytes = new TextEncoder().encode(line);
  if (bytes.length <= 75) {
    return line;
  }
  const decoder = new TextDecoder();
  const parts: string[] = [];
  let offset = 0;
  let budget = 75;
  while (offset < bytes.length) {
    let end = Math.min(bytes.length, offset + budget);
    while (end > offset && (bytes[end] & 0xc0) === 0x80) {
      end -= 1;
    }
    if (end === offset) {
      end = Math.min(bytes.length, offset + budget);
    }
    parts.push(decoder.decode(bytes.subarray(offset, end)));
    offset = end;
    budget = 74;
  }
  return parts.join('\r\n ');
}

function formatIcsLocal(ms: number): string {
  const date = new Date(ms);
  return `${icsDate(date)}T${icsTime(date)}`;
}

function formatIcsUtc(ms: number): string {
  return `${formatIcsLocal(ms)}Z`;
}

function icsDate(date: Date): string {
  return `${date.getUTCFullYear()}${icsPad(date.getUTCMonth() + 1)}${icsPad(date.getUTCDate())}`;
}

function icsTime(date: Date): string {
  return `${icsPad(date.getUTCHours())}${icsPad(date.getUTCMinutes())}${icsPad(date.getUTCSeconds())}`;
}

function icsPad(value: number): string {
  return String(value).padStart(2, '0');
}
