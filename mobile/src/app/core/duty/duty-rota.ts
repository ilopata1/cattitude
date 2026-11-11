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
  /** Length of one assignment. 24 hours changes at the trip's start clock time. */
  intervalHours: number;
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

export interface RosterDay {
  key: string;
  label: string;
  rows: DutySlot[];
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
      { id: 'watch', name: 'Watch', intervalHours: 4 },
      { id: 'cooking', name: 'Cooking', intervalHours: 24 },
      { id: 'inspection', name: 'Inspection', intervalHours: 24 },
      { id: 'cleaning', name: 'Cleaning', intervalHours: 24 },
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
  return {
    startAt: normalizeStart(source.startAt),
    crew: sanitizeCrew(source.crew),
    tasks: sanitizeTasks(source.tasks),
    updatedAt: clipText(source.updatedAt, 40),
  };
}

export function namedCrew(rota: DutyRota): CrewMember[] {
  return rota.crew.filter((person) => person.name.trim().length > 0);
}

/**
 * Assignments that overlap `[fromMs, toMs)`.
 * Slot `i` of a task belongs to named crew `i % crew`, counting from the trip start.
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
  const tasks = rota.tasks.filter((task) => task.name.trim());
  const slots: DutySlot[] = [];
  for (const task of tasks) {
    const interval = task.intervalHours * 60 * 60 * 1000;
    if (interval <= 0 || toMs <= start) {
      continue;
    }
    let index = fromMs > start ? Math.floor((fromMs - start) / interval) : 0;
    const last = Math.ceil((toMs - start) / interval);
    while (index < last && slots.length < MAX_SLOTS) {
      const slotStart = start + index * interval;
      const slotEnd = slotStart + interval;
      const person = people[index % people.length];
      index += 1;
      if (slotEnd <= fromMs || slotStart >= toMs) {
        continue;
      }
      if (crewId && person.id !== crewId) {
        continue;
      }
      slots.push({
        taskId: task.id,
        taskName: task.name.trim(),
        crewId: person.id,
        crewName: person.name.trim(),
        startMs: slotStart,
        endMs: slotEnd,
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

export function rosterWindow(
  rota: DutyRota,
  nowMs: number,
  pastDays: number,
  futureDays: number,
  crewId?: string | null,
): { days: RosterDay[]; canGoEarlier: boolean } {
  const start = parseWall(rota.startAt);
  if (start == null) {
    return { days: [], canGoEarlier: false };
  }
  const today = startOfWallDay(nowMs);
  const fromFloor = start > today ? start : today - Math.max(0, pastDays) * DAY_MS;
  const from = Math.max(start, fromFloor);
  const to = Math.max(today, startOfWallDay(start)) + Math.max(1, futureDays) * DAY_MS;
  const slots = dutySlots(rota, from, to, crewId);
  const groups = new Map<string, RosterDay>();
  for (const slot of slots) {
    const keyMs = startOfWallDay(slot.startMs);
    const key = new Date(keyMs).toISOString().slice(0, 10);
    let day = groups.get(key);
    if (!day) {
      day = { key, label: formatWallDay(keyMs), rows: [] };
      groups.set(key, day);
    }
    day.rows.push(slot);
  }
  return { days: [...groups.values()], canGoEarlier: from > start };
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

function sanitizeTasks(raw: unknown): DutyTask[] {
  if (!Array.isArray(raw)) {
    return [];
  }
  const tasks: DutyTask[] = [];
  const seen = new Set<string>();
  for (const item of raw.slice(0, 8)) {
    if (!item || typeof item !== 'object') {
      continue;
    }
    const row = item as Partial<DutyTask>;
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
    });
  }
  return tasks;
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
