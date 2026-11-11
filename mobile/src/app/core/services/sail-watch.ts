import { PolarWindowMinutes } from '../models/polar.model';

export interface SailWindowSnapshot {
  minutes: PolarWindowMinutes;
  covered: boolean;
  sailsDiffer: boolean;
  recommendedKey: string;
}

export interface SailWindowDecision {
  minutes: PolarWindowMinutes;
  notify: boolean;
  /** Null once this window's recommendation matches the sails that are up. */
  remembered: string | null;
}

/**
 * Each window decides on its own. A shorter window that already notified, or
 * that currently matches, does not silence a longer one. An uncovered window
 * keeps its memory so a brief gap does not send the same alert again.
 */
export function decideSailWindows(
  windows: readonly SailWindowSnapshot[],
  remembered: ReadonlyMap<PolarWindowMinutes, string | null>,
): SailWindowDecision[] {
  return windows.map(window => {
    const previous = remembered.get(window.minutes) ?? null;
    if (!window.covered) {
      return { minutes: window.minutes, notify: false, remembered: previous };
    }
    if (!window.sailsDiffer) {
      return { minutes: window.minutes, notify: false, remembered: null };
    }
    if (previous === window.recommendedKey) {
      return { minutes: window.minutes, notify: false, remembered: previous };
    }
    return { minutes: window.minutes, notify: true, remembered: window.recommendedKey };
  });
}
