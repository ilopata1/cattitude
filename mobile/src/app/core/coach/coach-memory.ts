/**
 * What the coach remembers: a finished A/B test, and a passage summary.
 * A test is quoted only when today's wind is still close and B won on VMG.
 * Summaries cover the passage, then stay seven days after arrival.
 */

import { AbSession, abArchiveFacts } from '../ab-test/ab-test';
import { DutyRota, dutySlots } from '../duty/duty-rota';
import { CoachSnapshot } from './coach.model';
import {
  AB_EVIDENCE_CONFIDENCE_PCT,
  AB_EVIDENCE_TWA_DEG,
  AB_EVIDENCE_TWS_KN,
  COACH_HS_ROUND_M,
  COACH_PERCENT_ROUND,
  COACH_SUMMARY_MS,
  COACH_SUMMARY_RETAIN_MS,
  COACH_WIND_ROUND_KN,
} from './coach-settings';

export interface CoachAbRecord {
  id: string;
  finishedAt: number;
  settingA: string;
  settingB: string;
  meanTwsKn: number | null;
  meanTwaDeg: number | null;
  vmgWinner: 'A' | 'B' | 'tie';
  vmgConfidencePct: number | null;
  /** How many percent B's VMG was above A's. Null when either mean is missing. */
  vmgDeltaPct: number | null;
}

export interface CoachSummary {
  at: number;
  passageId: string | null;
  twsKn: number | null;
  twaDeg: number | null;
  polarPct: number | null;
  helmDeg: number | null;
  rudderSdDeg: number | null;
  hsM: number | null;
  tpS: number | null;
  sailsUp: string;
}

export interface RememberedPassage {
  id: string;
  arrivedAtMs: number | null;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function coachAbRecord(session: AbSession, finishedAt: number): CoachAbRecord | null {
  const facts = abArchiveFacts(session);
  if (!facts) return null;
  return {
    id: session.legs.map(leg => `${leg.cycle}${leg.id}:${leg.startedAt}`).join('|'),
    finishedAt,
    settingA: session.setup.settingA.trim(),
    settingB: session.setup.settingB.trim(),
    meanTwsKn: facts.meanTwsKn,
    meanTwaDeg: facts.meanTwaDeg,
    vmgWinner: facts.vmgWinner,
    vmgConfidencePct: facts.vmgConfidencePct,
    vmgDeltaPct: vmgGainPct(facts.vmgAPct, facts.vmgBPct),
  };
}

export function vmgGainPct(aPct: number | null, bPct: number | null): number | null {
  if (aPct == null || bPct == null || !Number.isFinite(aPct) || !Number.isFinite(bPct) || aPct === 0) return null;
  const step = COACH_PERCENT_ROUND;
  return Math.round(((bPct - aPct) / Math.abs(aPct)) * 100 / step) * step;
}

export function matchingAbRecord(
  twsKn: number | null,
  twaDeg: number | null,
  records: readonly CoachAbRecord[],
): CoachAbRecord | null {
  if (twsKn == null || twaDeg == null) return null;
  const matches = records
    .filter(record => abRecordMatches(record, twsKn, twaDeg))
    .sort((a, b) => b.finishedAt - a.finishedAt);
  return matches[0] ?? null;
}

export function abEvidenceText(record: CoachAbRecord): string | null {
  if (record.vmgWinner !== 'B' || record.vmgDeltaPct == null || record.vmgDeltaPct <= 0) return null;
  if (record.vmgConfidencePct == null || record.vmgConfidencePct < AB_EVIDENCE_CONFIDENCE_PCT) return null;
  const setting = record.settingB.trim();
  if (!setting) return null;
  return `In similar wind (${coachDate(record.finishedAt)}), B (${setting}) beat A by ${record.vmgDeltaPct}% VMG at ${record.vmgConfidencePct}% confidence.`;
}

export function summaryFromSnapshot(snapshot: CoachSnapshot, passageId: string | null): CoachSummary {
  return {
    at: snapshot.builtAt,
    passageId,
    twsKn: snapshot.wind.tws.mean,
    twaDeg: snapshot.wind.twa.mean,
    polarPct: snapshot.performance.polarPct[30],
    helmDeg: snapshot.helm.weatherHelmDeg?.mean ?? null,
    rudderSdDeg: snapshot.helm.rudderSdDeg,
    hsM: snapshot.waves.estimate?.hs ?? null,
    tpS: snapshot.waves.estimate?.tpTrue ?? null,
    sailsUp: snapshot.sails.up,
  };
}

export function summaryHasFacts(row: CoachSummary): boolean {
  return row.twsKn != null
    || row.twaDeg != null
    || row.polarPct != null
    || row.helmDeg != null
    || row.rudderSdDeg != null
    || row.hsM != null
    || row.tpS != null
    || row.sailsUp.trim().length > 0;
}

export function summaryDue(lastAt: number | null, nowMs: number, intervalMs = COACH_SUMMARY_MS): boolean {
  if (lastAt == null) return true;
  return nowMs - lastAt >= intervalMs;
}

export function rememberPassage(
  list: readonly RememberedPassage[],
  passage: { id: string; arrivedAt: string | null } | null,
  nowMs: number,
): RememberedPassage[] {
  if (!passage?.id) return [...list];
  const arrived = passage.arrivedAt ? Date.parse(passage.arrivedAt) : NaN;
  const closed = list.map(item => {
    if (item.id === passage.id || item.arrivedAtMs != null) return item;
    return { ...item, arrivedAtMs: nowMs };
  });
  const rest = closed.filter(item => item.id !== passage.id);
  rest.push({
    id: passage.id,
    arrivedAtMs: Number.isFinite(arrived) ? arrived : null,
  });
  return rest;
}

export function keepSummaries(
  rows: readonly CoachSummary[],
  passages: readonly RememberedPassage[],
  nowMs: number,
  retainMs = COACH_SUMMARY_RETAIN_MS,
): CoachSummary[] {
  const byId = new Map(passages.map(item => [item.id, item]));
  return rows.filter(row => {
    if (!row.passageId) return nowMs - row.at <= retainMs;
    const passage = byId.get(row.passageId);
    if (!passage || passage.arrivedAtMs == null) {
      return passage ? true : nowMs - row.at <= retainMs;
    }
    return nowMs <= passage.arrivedAtMs + retainMs;
  });
}

export function prunePassages(
  list: readonly RememberedPassage[],
  nowMs: number,
  retainMs = COACH_SUMMARY_RETAIN_MS,
): RememberedPassage[] {
  return list.filter(item => item.arrivedAtMs == null || nowMs <= item.arrivedAtMs + retainMs);
}

export function watchStartedAt(rota: DutyRota, atMs: number): number | null {
  const slot = dutySlots(rota, atMs, atMs + 1)
    .find(item => item.taskId === 'watch' || item.taskName.toLowerCase() === 'watch');
  return slot?.startMs ?? null;
}

/** Change from the first summary of this watch to the latest. Null when nothing moved. */
export function sinceWatchLine(
  rows: readonly CoachSummary[],
  watchStartedAtMs: number | null,
  nowMs: number,
): string | null {
  if (watchStartedAtMs == null) return null;
  const span = rows
    .filter(row => row.at >= watchStartedAtMs && row.at <= nowMs)
    .sort((a, b) => a.at - b.at);
  if (span.length < 2) return null;
  const early = span[0];
  const late = span[span.length - 1];
  const parts: string[] = [];
  const wind = roundedDelta(early.twsKn, late.twsKn, COACH_WIND_ROUND_KN);
  if (wind != null && wind !== 0) parts.push(wind > 0 ? `TWS up ${wind} kn` : `TWS down ${Math.abs(wind)} kn`);
  const earlyPolar = roundTo(early.polarPct, COACH_PERCENT_ROUND);
  const latePolar = roundTo(late.polarPct, COACH_PERCENT_ROUND);
  if (earlyPolar != null && latePolar != null && earlyPolar !== latePolar) {
    parts.push(`polar percent from ${earlyPolar} to ${latePolar}`);
  }
  const earlyHelm = roundTo(early.helmDeg, COACH_PERCENT_ROUND);
  const lateHelm = roundTo(late.helmDeg, COACH_PERCENT_ROUND);
  if (earlyHelm != null && lateHelm != null && earlyHelm !== lateHelm) {
    parts.push(`helm from ${earlyHelm}° to ${lateHelm}°`);
  }
  const earlyHs = roundTo(early.hsM, COACH_HS_ROUND_M);
  const lateHs = roundTo(late.hsM, COACH_HS_ROUND_M);
  if (earlyHs != null && lateHs != null && earlyHs !== lateHs) {
    parts.push(`wave height from ${earlyHs.toFixed(1)} m to ${lateHs.toFixed(1)} m`);
  }
  if (early.sailsUp.trim() && late.sailsUp.trim() && early.sailsUp.trim() !== late.sailsUp.trim()) {
    parts.push(`sails changed from ${early.sailsUp.trim()} to ${late.sailsUp.trim()}`);
  }
  if (!parts.length) return null;
  return `Since the last watch: ${parts.join(', ')}.`;
}

function abRecordMatches(record: CoachAbRecord, twsKn: number, twaDeg: number): boolean {
  if (record.meanTwsKn == null || record.meanTwaDeg == null) return false;
  if (Math.abs(record.meanTwsKn - twsKn) > AB_EVIDENCE_TWS_KN) return false;
  return angleApart(record.meanTwaDeg, twaDeg) <= AB_EVIDENCE_TWA_DEG;
}

function angleApart(a: number, b: number): number {
  const diff = Math.abs(a - b) % 360;
  return diff > 180 ? 360 - diff : diff;
}

function coachDate(ms: number): string {
  const date = new Date(ms);
  return `${date.getUTCDate()} ${MONTHS[date.getUTCMonth()]} ${date.getUTCFullYear()}`;
}

function roundedDelta(early: number | null, late: number | null, step: number): number | null {
  const from = roundTo(early, step);
  const to = roundTo(late, step);
  if (from == null || to == null) return null;
  return Math.round((to - from) / step) * step;
}

function roundTo(value: number | null, step: number): number | null {
  if (value == null || !Number.isFinite(value) || !(step > 0)) return null;
  return Math.round(value / step) * step;
}
