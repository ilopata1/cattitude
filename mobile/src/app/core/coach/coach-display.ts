/**
 * What the coach may show, and which less-sail findings may notify.
 * The on-screen text changes only after the hold, and only when the page
 * is opened again or Refresh is pressed.
 */

import { DutyRota, dutySlots } from '../duty/duty-rota';
import { solarElevationDeg } from './coach-features';
import { CoachFinding } from './coach.model';
import {
  COACH_BRIEF_HOLD_MS,
  COACH_NIGHT_ELEVATION_MAX_DEG,
  COACH_REBUILD_MIN_MS,
  WATCH_HANDOVER_MIN,
} from './coach-settings';

export const COACH_OPEN_NOTE = 'Coach updates while this app is open.';

export interface HeldBrief {
  generatedAt: number;
}

export interface CoachPushDecision {
  notify: { id: string; text: string }[];
  /** Finding ids still active. A cleared id can notify again next time. */
  open: string[];
}

export function briefMayRefresh(
  held: HeldBrief | null,
  nowMs: number,
  holdMs = COACH_BRIEF_HOLD_MS,
): boolean {
  if (!held) return true;
  return nowMs - held.generatedAt >= holdMs;
}

export function rebuildMayRun(lastAtMs: number | null, nowMs: number, minMs = COACH_REBUILD_MIN_MS): boolean {
  if (lastAtMs == null) return true;
  return nowMs - lastAtMs >= minMs;
}

export function decideCoachPush(
  findings: readonly CoachFinding[],
  open: ReadonlySet<string>,
): CoachPushDecision {
  const active = findings.filter(finding => finding.severity === 'action' && finding.direction === 'less-sail');
  return {
    notify: active
      .filter(finding => !open.has(finding.id))
      .map(finding => ({ id: finding.id, text: finding.text })),
    open: active.map(finding => finding.id),
  };
}

export function coachPreview(text: string): { header: string; bottom: string } {
  const blocks = text.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
  const header = blocks[0] ?? '';
  const bottom = blocks.find(block => block.startsWith('BOTTOM LINE')) ?? '';
  return { header, bottom };
}

/** Header, bottom line, sail plan, and downwind. Other sections stay out of the handover. */
export function handoverBrief(text: string): string {
  const blocks = text.split('\n\n').map(block => block.trim()).filter(block => block.length > 0);
  return blocks.filter((block, index) => (
    index === 0
    || block.startsWith('BOTTOM LINE')
    || block.startsWith('SAIL PLAN')
    || block.startsWith('DOWNWIND')
  )).join('\n\n');
}

export function handoverDue(minutesToWatchChange: number | null, withinMin = WATCH_HANDOVER_MIN): boolean {
  return minutesToWatchChange != null && minutesToWatchChange <= withinMin;
}

export function minutesUntilNight(
  position: { lat: number; lon: number } | null,
  nowMs: number,
): number | null {
  if (!position) return null;
  if (solarElevationDeg(position.lat, position.lon, nowMs) < COACH_NIGHT_ELEVATION_MAX_DEG) return 0;
  const horizon = 18 * 60;
  for (let minute = 1; minute <= horizon; minute += 1) {
    const elevation = solarElevationDeg(position.lat, position.lon, nowMs + minute * 60_000);
    if (elevation < COACH_NIGHT_ELEVATION_MAX_DEG) return minute;
  }
  return null;
}

export function nextWatchChange(
  rota: DutyRota,
  atMs: number,
): { at: number; name: string; minutes: number } | null {
  const current = dutySlots(rota, atMs, atMs + 1).find(slot => slot.taskId === 'watch' || slot.taskName.toLowerCase() === 'watch');
  if (!current) return null;
  const next = dutySlots(rota, current.endMs, current.endMs + 1)
    .find(slot => slot.taskId === current.taskId);
  if (!next?.crewName) return null;
  return {
    at: current.endMs,
    name: next.crewName,
    minutes: (current.endMs - atMs) / 60_000,
  };
}
