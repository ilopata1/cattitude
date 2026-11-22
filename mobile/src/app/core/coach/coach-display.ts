/**
 * What the coach may show, and when the gust warning may notify.
 * The on-screen briefing changes only after the hold, and only when Ask
 * Skip is opened or Refresh is pressed. Sail-plan changes are notified
 * from the Polar watch and do not pass through the gust repeat check:
 * stripping the numbers would treat reef 1 and reef 2 as the same warning.
 */

import { DutyRota, dutySlots } from '../duty/duty-rota';
import { solarElevationDeg } from './coach-features';
import { CoachFinding } from './coach.model';
import {
  COACH_BRIEF_HOLD_MS,
  COACH_NIGHT_ELEVATION_MAX_DEG,
  COACH_REBUILD_MIN_MS,
  GUST_WARNING_QUIET_MS,
  WATCH_HANDOVER_MIN,
} from './coach-settings';

const GUST_WARNING_ID = 'sails.reef-gust-spread';

export const COACH_OPEN_NOTE = 'Coach updates while this app is open.';

export interface HeldBrief {
  generatedAt: number;
}

export interface GustWarningMemory {
  /** Warning with the speeds removed. Null until one has been sent. */
  signature: string | null;
  /** When the gust warning last dropped out. Null while it is active. */
  absentSinceMs: number | null;
}

export interface CoachPushDecision {
  notify: { id: string; text: string }[];
  memory: GustWarningMemory;
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

/** Speeds and other trigger values removed, so 25 kn and 27 kn are one warning. */
export function gustWarningSignature(text: string): string {
  return text.replace(/-?\d+(?:\.\d+)?/g, '#').replace(/\s+/g, ' ').trim().toLowerCase();
}

export function emptyGustWarningMemory(): GustWarningMemory {
  return { signature: null, absentSinceMs: null };
}

/**
 * Ask Skip findings stay in the briefing. The gust warning can notify, and
 * a later one that differs only by the knots that triggered it stays quiet
 * until the warning has been gone for the quiet period.
 */
export function decideCoachPush(
  findings: readonly CoachFinding[],
  memory: GustWarningMemory,
  nowMs: number,
  quietMs = GUST_WARNING_QUIET_MS,
): CoachPushDecision {
  const gust = findings.find(finding => (
    finding.id === GUST_WARNING_ID
    && finding.severity === 'action'
    && finding.direction === 'less-sail'
  ));
  if (!gust) {
    const absentSinceMs = memory.signature == null || memory.absentSinceMs != null
      ? memory.absentSinceMs
      : nowMs;
    return { notify: [], memory: { ...memory, absentSinceMs } };
  }
  const signature = gustWarningSignature(gust.text);
  const sameWarning = signature === memory.signature;
  const stillQuiet = memory.absentSinceMs == null || nowMs - memory.absentSinceMs < quietMs;
  const duplicate = memory.signature != null && sameWarning && stillQuiet;
  return {
    notify: duplicate ? [] : [{ id: gust.id, text: gust.text }],
    memory: { signature, absentSinceMs: null },
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

const WATCH_LOOKAHEAD_MS = 48 * 60 * 60 * 1000;

export function nextWatchChange(
  rota: DutyRota,
  atMs: number,
): { at: number; name: string; minutes: number } | null {
  const onWatch = dutySlots(rota, atMs, atMs + 1).filter(isWatchSlot);
  if (!onWatch.length) return null;
  const next = dutySlots(rota, atMs, atMs + WATCH_LOOKAHEAD_MS)
    .find(slot => slot.taskId === onWatch[0].taskId && slot.startMs > atMs);
  if (!next?.crewName) return null;
  return {
    at: next.startMs,
    name: next.crewName,
    minutes: (next.startMs - atMs) / 60_000,
  };
}

function isWatchSlot(slot: { taskId: string; taskName: string }): boolean {
  return slot.taskId === 'watch' || slot.taskName.toLowerCase() === 'watch';
}
