import { POLAR_WINDOW_MINUTES, PolarWindowMinutes } from '../models/polar.model';

/** How long a polar sample stays in the rolling buffer. Matches the longest window. */
export const POLAR_BUFFER_MS = 60 * 60 * 1000;
/** Live readings are recorded about once a second. */
export const POLAR_SAMPLE_INTERVAL_MS = 1_000;
/** A sample newer than this still counts as the current end of the window. */
export const POLAR_STALE_AFTER_MS = 15_000;
/**
 * How long a window card keeps its last percentage and sail recommendation
 * after coverage drops, so a short gap does not collapse the page.
 */
export const POLAR_DISPLAY_HOLD_MS = 90_000;

/**
 * True when live samples reach back across `windowMs` and the newest is still fresh.
 *
 * The buffer drops a sample as soon as it is strictly older than the window, so a
 * full window's oldest sample sits about one sample interval inside the far edge.
 * A single recent reading, or a reading left over after the instruments go quiet,
 * does not count.
 */
export function polarWindowCovered(
  samples: readonly { timestamp: number }[],
  windowMs: number,
  now: number,
  sampleIntervalMs = POLAR_SAMPLE_INTERVAL_MS,
  freshMs = POLAR_STALE_AFTER_MS,
): boolean {
  const cutoff = now - windowMs;
  let oldest = Infinity;
  let newest = -Infinity;
  for (const sample of samples) {
    if (sample.timestamp < cutoff || sample.timestamp > now) {
      continue;
    }
    if (sample.timestamp < oldest) {
      oldest = sample.timestamp;
    }
    if (sample.timestamp > newest) {
      newest = sample.timestamp;
    }
  }
  if (!Number.isFinite(oldest)) {
    return false;
  }
  return now - oldest >= windowMs - sampleIntervalMs && now - newest <= freshMs;
}

/**
 * A longer window stays closed until every shorter window is open.
 * Samples at the ends of thirty minutes, with nothing in the last fifteen,
 * are not a thirty-minute average.
 */
export function polarWindowReady(
  samples: readonly { timestamp: number }[],
  minutes: PolarWindowMinutes,
  now: number,
  sampleIntervalMs = POLAR_SAMPLE_INTERVAL_MS,
  freshMs = POLAR_STALE_AFTER_MS,
): boolean {
  for (const candidate of POLAR_WINDOW_MINUTES) {
    if (!polarWindowCovered(samples, candidate * 60 * 1000, now, sampleIntervalMs, freshMs)) {
      return false;
    }
    if (candidate === minutes) return true;
  }
  return false;
}

/** Put a boat-clock timestamp on the phone's clock. The newest sample lands at "now". */
export function alignHistoryTimestamp(serverT: number, serverNow: number, clientNow: number): number {
  return clientNow + (serverT - serverNow);
}

export interface HeldWindow<T extends { covered: boolean }> {
  value: T;
  at: number;
}

/**
 * Keep the last open window on screen through a short gap. A new open window
 * replaces it immediately. A gap longer than `holdMs` shows the closed window.
 */
export function holdWindowDisplay<T extends { covered: boolean }>(
  next: T,
  previous: HeldWindow<T> | undefined,
  now: number,
  holdMs = POLAR_DISPLAY_HOLD_MS,
): { display: T; held: HeldWindow<T> | undefined } {
  if (next.covered) {
    return { display: next, held: { value: next, at: now } };
  }
  if (previous && now - previous.at < holdMs) {
    return { display: previous.value, held: previous };
  }
  return { display: next, held: undefined };
}
