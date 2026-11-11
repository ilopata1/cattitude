import { walkItemIds } from './walk-around';

export interface InspectionMark {
  done: boolean;
  note: string;
}

export interface InspectionDay {
  date: string;
  marks: Record<string, InspectionMark>;
  updatedAt: string;
}

export interface InspectionProgress {
  done: number;
  total: number;
  percent: number;
}

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const ITEM_RE = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
const MAX_DAYS = 400;
const NOTE_LIMIT = 500;

export function emptyDay(date: string, updatedAt = ''): InspectionDay {
  return { date, marks: {}, updatedAt };
}

export function sanitizeDay(raw: unknown): InspectionDay | null {
  if (!raw || typeof raw !== 'object') {
    return null;
  }
  const source = raw as Partial<InspectionDay>;
  if (typeof source.date !== 'string' || !DATE_RE.test(source.date)) {
    return null;
  }
  const marks: Record<string, InspectionMark> = {};
  const incoming = source.marks && typeof source.marks === 'object' ? source.marks : {};
  for (const [id, mark] of Object.entries(incoming).slice(0, 200)) {
    if (!ITEM_RE.test(id) || !mark || typeof mark !== 'object') {
      continue;
    }
    const row = mark as Partial<InspectionMark>;
    const note = typeof row.note === 'string' ? row.note.trim().slice(0, NOTE_LIMIT) : '';
    const done = row.done === true;
    if (!done && !note) {
      continue;
    }
    marks[id] = { done, note };
  }
  return {
    date: source.date,
    marks,
    updatedAt: typeof source.updatedAt === 'string' ? source.updatedAt.trim().slice(0, 40) : '',
  };
}

export function dayHasContent(day: InspectionDay): boolean {
  return Object.values(day.marks).some((mark) => mark.done || mark.note.trim().length > 0);
}

export function inspectionProgress(day: InspectionDay, itemIds: readonly string[] = walkItemIds()): InspectionProgress {
  const total = itemIds.length;
  let done = 0;
  for (const id of itemIds) {
    if (day.marks[id]?.done) {
      done += 1;
    }
  }
  return { done, total, percent: total ? Math.round((done / total) * 100) : 0 };
}

export function clearDay(day: InspectionDay, updatedAt: string): InspectionDay {
  return { date: day.date, marks: {}, updatedAt };
}

/** Dirty local days win. Otherwise the newer `updatedAt` wins. Missing days are filled in. */
export function mergeInspectionDays(
  local: InspectionDay[],
  remote: InspectionDay[],
  dirtyDates: ReadonlySet<string>,
): InspectionDay[] {
  const merged = new Map<string, InspectionDay>();
  for (const day of local) {
    const clean = sanitizeDay(day);
    if (clean) {
      merged.set(clean.date, clean);
    }
  }
  for (const day of remote) {
    const clean = sanitizeDay(day);
    if (!clean || dirtyDates.has(clean.date)) {
      continue;
    }
    const have = merged.get(clean.date);
    if (!have || clean.updatedAt > have.updatedAt) {
      merged.set(clean.date, clean);
    }
  }
  return [...merged.values()]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-MAX_DAYS);
}
