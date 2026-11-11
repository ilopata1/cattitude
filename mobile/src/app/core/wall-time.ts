/** Boat clock as entered: calendar arithmetic that does not follow a timezone or DST. */

export const DAY_MS = 24 * 60 * 60 * 1000;

const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** The phone's current clock, read as a wall time. */
export function wallNowMs(now = new Date()): number {
  return Date.UTC(
    now.getFullYear(),
    now.getMonth(),
    now.getDate(),
    now.getHours(),
    now.getMinutes(),
    now.getSeconds(),
  );
}

export function todayKey(now = new Date()): string {
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function startOfWallDay(ms: number): number {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

/** `YYYY-MM-DDTHH:mm`, or null when it is not a real calendar time. */
export function parseWall(value: string): number | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(value);
  if (!match) {
    return null;
  }
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) {
    return null;
  }
  const ms = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(ms);
  if (
    check.getUTCFullYear() !== year
    || check.getUTCMonth() !== month - 1
    || check.getUTCDate() !== day
  ) {
    return null;
  }
  return ms;
}

export function formatWallTime(ms: number): string {
  const date = new Date(ms);
  return `${pad(date.getUTCHours())}:${pad(date.getUTCMinutes())}`;
}

export function formatWallDay(ms: number): string {
  const date = new Date(ms);
  return `${WEEKDAYS[date.getUTCDay()]} ${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]}`;
}

export function formatDateKey(date: string): string {
  const ms = parseWall(`${date}T12:00`);
  return ms == null ? date : formatWallDay(ms);
}

export function weekdayShort(ms: number): string {
  return WEEKDAYS[new Date(ms).getUTCDay()].slice(0, 3);
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}
