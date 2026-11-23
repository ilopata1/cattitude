/**
 * Deterministic coaching brief. This is the offline text and the reference
 * the optional rewrite is checked against. Empty sections are left out.
 * The header and the bottom line are always present.
 */

import { CoachFinding, CoachSnapshot, Confidence } from './coach.model';
import {
  COACH_ANGLE_ROUND_DEG,
  COACH_BOTTOM_LINE_MAX,
  COACH_BRIEF_LONG_WORDS,
  COACH_BRIEF_SHORT_WORDS,
  COACH_CAVEAT_LINES,
  COACH_HELM_ROUND_DEG,
  COACH_HS_ROUND_M,
  COACH_PERCENT_ROUND,
  COACH_WIND_ROUND_KN,
  FOLLOWING_STERN_DEG,
  PRESSURE_NOTABLE_HPA,
  REEF_BEFORE_WATCH_MIN,
} from './coach-settings';

export interface CoachBriefingOptions {
  /** IANA zone for the header clock. Omit it to use the machine's zone. */
  timeZone?: string;
}

export interface CoachBriefing {
  short: string;
  long: string;
}

const SEVERITY_RANK = { action: 0, prepare: 1, info: 2 };
const CONFIDENCE_RANK: Record<Confidence, number> = { high: 0, medium: 1, low: 2, none: 3 };
const SECTION_RANK = {
  sails: 0,
  balance: 1,
  performance: 2,
  waves: 3,
  downwind: 4,
  outlook: 5,
  data: 6,
};

/** Missing and stale inputs stay out of Ask Skip. The topics they feed stay quiet. */
export function findingsForAskSkip(findings: readonly CoachFinding[]): CoachFinding[] {
  return findings.filter(item => !/^data\.(missing|stale)\./.test(item.id));
}

export function coachBriefing(
  snapshot: CoachSnapshot,
  findings: CoachFinding[],
  options: CoachBriefingOptions = {},
): CoachBriefing {
  const ordered = findingsForAskSkip(findings).slice().sort(compareFindings);
  const zone = options.timeZone;
  const bottom = bottomLines(snapshot, ordered, zone);
  const shared = [headerLine(snapshot, zone), bottomBlock(bottom)];
  const shortBody = [
    sailBlock(snapshot, ordered, bottom.join(' ')),
    downwindBlock(snapshot, ordered),
    nextBlock(snapshot, ordered),
    caveatBlock(ordered),
  ].filter((block): block is string => block != null);
  const longBody = [
    sailBlock(snapshot, ordered, bottom.join(' ')),
    balanceBlock(snapshot, ordered),
    performanceBlock(snapshot, ordered),
    seaBlock(snapshot, ordered),
    downwindBlock(snapshot, ordered),
    nextBlock(snapshot, ordered),
    caveatBlock(ordered),
  ].filter((block): block is string => block != null);
  return {
    short: fitWords([...shared, ...shortBody], COACH_BRIEF_SHORT_WORDS),
    long: fitWords([...shared, ...longBody], COACH_BRIEF_LONG_WORDS),
  };
}

function headerLine(snapshot: CoachSnapshot, timeZone: string | undefined): string {
  const base = `${clock(snapshot.builtAt, timeZone)} · ${snapshot.windowMin} min window`;
  const health = healthLine(snapshot);
  return health ? `${base} · ${health}` : base;
}

function healthLine(snapshot: CoachSnapshot): string | null {
  const gaps = snapshot.dataHealth.filter(row => row.status !== 'ok');
  if (gaps.length) return null;
  const wave = snapshot.waves.estimate;
  if (wave && !snapshot.waves.usable) {
    return wave.ambiguous
      ? 'data OK (wave direction unresolved)'
      : 'data OK (wave direction low confidence)';
  }
  if (wave && wave.confidence !== 'high' && wave.confidence !== 'none') {
    return `data OK (wave direction ${wave.confidence} confidence)`;
  }
  return 'data OK';
}

function bottomLines(snapshot: CoachSnapshot, findings: CoachFinding[], timeZone: string | undefined): string[] {
  const lines = [
    sailSafetyLine(snapshot, findings),
    workloadLine(snapshot, findings),
    handoverLine(snapshot, timeZone),
  ].filter((line): line is string => line != null);
  if (lines.length) return lines.slice(0, COACH_BOTTOM_LINE_MAX);
  return [noChangeLine(snapshot, findings)];
}

function sailSafetyLine(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  const dark = findings.some(item => item.id === 'sails.reef-before-dark');
  const gust = findings.find(item => item.id === 'sails.reef-gust-spread');
  const mismatch = findings.find(item => item.id === 'sails.mismatch');
  const heavy = findings.find(item => item.id === 'sails.heavy-overlay');
  if (!dark && !gust && !mismatch && !heavy) {
    const near = findings.find(item => item.id === 'sails.near-cutover');
    return near ? cutoverIf(snapshot, near) : null;
  }
  if (heavy && !dark && !gust && !mismatch) return period(heavy.text);
  const reasons = sailReasons(snapshot, gust, mismatch != null || dark);
  const action = reefName(snapshot.sails.advice?.primary);
  if (dark && !snapshot.isNight) {
    return reasons.length
      ? `Take ${action} before dark: ${reasons.join(' and ')}.`
      : `Take ${action} before dark.`;
  }
  if (dark && snapshot.isNight) {
    return reasons.length
      ? `It is dark, so take ${action}: ${reasons.join(' and ')}.`
      : `It is dark, so take ${action}.`;
  }
  if (gust?.evidence['gustKn'] != null) {
    return `Set the sail for the gusts, not the mean: ${reasons.join(' and ')}.`;
  }
  if (gust) return period(gust.text);
  if (mismatch) {
    const minutes = mismatch.evidence['minutes'];
    const up = snapshot.sails.up.trim();
    const recommended = snapshot.sails.advice?.primary.trim() ?? '';
    const held = typeof minutes === 'number' ? ` for ${minutes} min` : '';
    return `Sail plan recommends ${recommended}; ${up} is up${held}.`;
  }
  return null;
}

function sailReasons(
  snapshot: CoachSnapshot,
  gust: CoachFinding | undefined,
  quoteAvoid: boolean,
): string[] {
  const reasons: string[] = [];
  if (typeof gust?.evidence['gustKn'] === 'number') {
    reasons.push(`gusts reach ${kn(gust.evidence['gustKn'])} kn`);
  } else if (typeof gust?.evidence['gustSpreadKn'] === 'number') {
    reasons.push(`gusts are ${kn(gust.evidence['gustSpreadKn'])} kn above the mean`);
  }
  const avoid = snapshot.sails.advice?.avoid?.trim().replace(/\.$/, '') ?? '';
  if (quoteAvoid && avoid) {
    reasons.push(/^avoid\b/i.test(avoid) ? `the plan says ${avoid}` : `the plan says avoid ${avoid}`);
  }
  return reasons;
}

function workloadLine(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  const work = findings.find(item => item.id === 'balance.pilot-workload');
  if (!work) return null;
  const who = snapshot.helm.autopilotEngaged === true ? 'Pilot' : 'Helm';
  const rudder = work.evidence['rudderSdDeg'];
  const heading = work.evidence['headingSdDeg'];
  const detail = typeof rudder === 'number'
    ? `${who} is working hard (rudder ±${helm(rudder)}°).`
    : `${who} is working hard (heading ±${helm(Number(heading))}°).`;
  if (work.direction === 'less-sail' && followingSea(snapshot)) {
    return `${detail} Reefing should ease it; if not, bring the waves further onto the quarter.`;
  }
  if (work.direction === 'less-sail') return `${detail} Depower or change angle.`;
  return `${detail} Ease it if it keeps building.`;
}

function handoverLine(snapshot: CoachSnapshot, timeZone: string | undefined): string | null {
  const minutes = snapshot.outlook.minutesToWatchChange;
  const name = snapshot.outlook.nextWatchName?.trim();
  if (minutes == null || !name || !(minutes <= REEF_BEFORE_WATCH_MIN)) return null;
  const when = snapshot.outlook.nextWatchAt != null
    ? `at the ${clock(snapshot.outlook.nextWatchAt, timeZone)} handover`
    : `in ${Math.round(minutes)} min`;
  const trend = snapshot.wind.twsTrendKnPerHour;
  const rise = trend != null && trend > 0 ? `: TWS rising about ${kn(trend)} kn an hour` : '';
  return `Brief ${name} ${when}${rise}.`;
}

function noChangeLine(snapshot: CoachSnapshot, findings: CoachFinding[]): string {
  const near = findings.find(item => item.id === 'sails.near-cutover');
  if (near && snapshot.sails.nextCutover && typeof near.evidence['cutover'] === 'number') {
    const twsCut = snapshot.sails.nextCutover.kind === 'tws';
    const value = twsCut ? kn(near.evidence['cutover']) : angle(near.evidence['cutover']);
    return `No change. Next decision point: the ${value} ${twsCut ? 'kn' : '°'} sail change.`;
  }
  const minutes = snapshot.outlook.minutesToWatchChange;
  const name = snapshot.outlook.nextWatchName?.trim();
  if (minutes != null && name) {
    return `No change. Next decision point: ${name}'s watch in ${Math.round(minutes)} min.`;
  }
  return 'No change. Next decision point: none in the next few hours.';
}

function sailBlock(snapshot: CoachSnapshot, findings: CoachFinding[], bottom: string): string | null {
  const advice = snapshot.sails.advice;
  const up = snapshot.sails.up.trim();
  if ((!advice || advice.empty || !advice.primary.trim()) && !up) return null;
  const parts: string[] = [];
  if (advice && !advice.empty && advice.primary.trim()) {
    parts.push(`Plan for ${band(advice.twsBand.from, advice.twsBand.to)} kn at ${advice.twaBand.from}\u2013${advice.twaBand.to}°: ${advice.primary.trim()}.`);
  }
  const mismatch = findings.find(item => item.id === 'sails.mismatch');
  const minutes = mismatch?.evidence['minutes'];
  if (up && mismatch && typeof minutes === 'number') parts.push(`Up: ${up}, mismatch for ${minutes} min.`);
  else if (up && findings.some(item => item.id === 'sails.mismatch-short')) parts.push(`Up: ${up}. Hold if it's a shift.`);
  else if (up) parts.push(`Up: ${up}.`);
  if (advice?.notes?.trim()) parts.push(period(advice.notes.trim()));
  const avoid = advice?.avoid?.trim() ?? '';
  if (avoid && !bottom.includes(avoid)) parts.push(period(/^avoid\b/i.test(avoid) ? avoid : `Avoid: ${avoid}`));
  return parts.length ? `SAIL PLAN  ${parts.join(' ')}` : null;
}

function balanceBlock(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  const line = workloadLine(snapshot, findings);
  const helmFinding = findings.find(item => item.id === 'balance.weather-helm' || item.id === 'balance.lee-helm');
  const parts = [helmFinding?.text, line].filter((part): part is string => part != null);
  return parts.length ? `BALANCE  ${parts.join(' ')}` : null;
}

function performanceBlock(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  const sensor = findings.find(item => item.id === 'performance.sensor-suspect');
  const low = findings.find(item => item.id === 'performance.low-polar');
  const parts: string[] = [];
  if (sensor) parts.push(period(sensor.text));
  else if (low) parts.push(period(low.text));
  const windows = ([15, 30, 60] as const)
    .filter(window => snapshot.performance.polarPct[window] != null)
    .map(window => `${window} min ${pct(snapshot.performance.polarPct[window] as number)}%`);
  if (windows.length && !low) parts.push(`Polar ${windows.join(', ')}.`);
  if (snapshot.performance.vmgKn != null) parts.push(`VMG ${kn(snapshot.performance.vmgKn)} kn.`);
  if (snapshot.performance.vmcKn != null) parts.push(`VMC ${kn(snapshot.performance.vmcKn)} kn.`);
  return parts.length ? `PERFORMANCE  ${parts.join(' ')}` : null;
}

function seaBlock(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  if (!snapshot.waves.usable || snapshot.pointOfSail === 'downwind') return null;
  const steep = findings.find(item => item.id === 'waves.steep');
  const angle = findings.find(item => item.id === 'waves.angle');
  if (!steep && !angle) return null;
  const parts = [seaFacts(snapshot), steep?.text, angleHeading(angle)].filter((part): part is string => part != null);
  return parts.length ? `SEA & ANGLE  ${parts.join(' ')}` : null;
}

function downwindBlock(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  if (snapshot.pointOfSail !== 'downwind') return null;
  const parts: string[] = [];
  const surf = findings.find(item => item.id === 'downwind.surf-conditions');
  if (surf && typeof surf.evidence['surfs'] === 'number' && typeof surf.evidence['windowMin'] === 'number') {
    const peak = surf.evidence['peakKn'];
    const peakText = typeof peak === 'number' ? `, peak ${kn(peak)} kn` : '';
    parts.push(`${surf.evidence['surfs']} surfs in ${surf.evidence['windowMin']} min${peakText}.`);
  }
  const waves = waveTravel(snapshot);
  if (waves) parts.push(waves);
  const nose = findings.find(item => item.id === 'downwind.nose-dive-margin');
  if (nose) parts.push(period(nose.text));
  if (surf || nose) parts.push('Peak period may be swell, not the wind waves you surf.');
  return parts.length ? `DOWNWIND  ${parts.join(' ')}` : null;
}

function nextBlock(snapshot: CoachSnapshot, findings: CoachFinding[]): string | null {
  const parts: string[] = [];
  const near = findings.find(item => item.id === 'sails.near-cutover');
  if (near) {
    const trigger = cutoverIf(snapshot, near);
    if (trigger) parts.push(trigger);
  }
  const pressure = findings.find(item => item.id === 'outlook.pressure');
  const trend = snapshot.outlook.pressureTrend3hHpa;
  if (pressure) parts.push(period(pressure.text));
  else if (trend != null && !(trend <= PRESSURE_NOTABLE_HPA)) {
    parts.push(`Pressure steady (${signedHpa(Math.round(trend))} hPa in 3 h).`);
  }
  return parts.length ? `NEXT 1\u20133 H  ${parts.join(' ')}` : null;
}

function caveatBlock(findings: CoachFinding[]): string | null {
  const lines = findings
    .filter(item => item.section === 'data'
      && item.id !== 'downwind.swell-caveat'
      && item.id !== 'performance.sensor-suspect')
    .slice(0, COACH_CAVEAT_LINES)
    .map(item => period(item.text));
  return lines.length ? `CAVEATS  ${lines.join(' ')}` : null;
}

function cutoverIf(snapshot: CoachSnapshot, near: CoachFinding): string | null {
  const cut = snapshot.sails.nextCutover;
  const value = near.evidence['cutover'];
  const next = near.evidence['next'];
  if (!cut || typeof value !== 'number') return null;
  if (cut.kind === 'tws' && typeof next === 'string') {
    return `If TWS holds above ${kn(value)} kn, the plan moves to ${next}.`;
  }
  if (cut.kind === 'twa' && typeof next === 'string') {
    return `If the wind angle holds past ${angle(value)}°, the plan moves to ${next}.`;
  }
  const unit = cut.kind === 'tws' ? 'kn' : '°';
  return `Next sail change is the ${cut.kind === 'tws' ? kn(value) : angle(value)} ${unit} cutover.`;
}

function seaFacts(snapshot: CoachSnapshot): string | null {
  const estimate = snapshot.waves.estimate;
  if (!estimate || estimate.hs == null || estimate.tpTrue == null || snapshot.waves.wavelengthM == null) return null;
  const from = estimate.dirFromTrue == null ? '' : ` from ${angle(estimate.dirFromTrue)}° true`;
  const relative = estimate.dirTravelBow == null ? '' : `, ${relativePhrase(estimate.dirTravelBow)}`;
  const ratio = snapshot.waves.lengthRatio == null ? '' : ` (${round1(snapshot.waves.lengthRatio)} times the waterline)`;
  return `Waves${from}${relative}. Height ${hs(estimate.hs)} m, period ${round1(estimate.tpTrue)} s, wavelength ${Math.round(snapshot.waves.wavelengthM)} m${ratio}.`;
}

function angleHeading(angleFinding: CoachFinding | undefined): string | null {
  if (!angleFinding) return null;
  const change = angleFinding.evidence['headingChangeDeg'];
  const place = angleFinding.evidence['place'];
  const cost = angleFinding.evidence['vmgCostKn'];
  if (typeof change !== 'number' || typeof place !== 'string') return null;
  const vmg = typeof cost === 'number' ? ` VMG cost about ${kn(Math.abs(cost))} kn.` : '';
  return `A ${angle(change)}° heading change puts them on the ${place}.${vmg}`;
}

function waveTravel(snapshot: CoachSnapshot): string | null {
  if (!snapshot.waves.usable || snapshot.waves.wavelengthM == null || snapshot.waves.phaseSpeedKn == null) return null;
  return `Waves ${Math.round(snapshot.waves.wavelengthM)} m long, travelling about ${kn(snapshot.waves.phaseSpeedKn)} kn.`;
}

function followingSea(snapshot: CoachSnapshot): boolean {
  const travel = snapshot.waves.estimate?.dirTravelBow;
  if (!snapshot.waves.usable || travel == null) return false;
  return Math.abs(180 - Math.abs(signed180(travel))) <= FOLLOWING_STERN_DEG;
}

function relativePhrase(dirTravelBow: number): string {
  const abs = Math.abs(signed180(dirTravelBow));
  const offStern = Math.abs(180 - abs);
  if (offStern <= FOLLOWING_STERN_DEG) return `${angle(offStern)}° off the stern`;
  return `${angle(abs)}° off the bow`;
}

function reefName(primary: string | undefined): string {
  const name = primary?.trim() ?? '';
  if (/1st reef|first reef/i.test(name)) return 'the first reef';
  if (/2nd reef|second reef/i.test(name)) return 'the second reef';
  if (/3rd reef|third reef/i.test(name)) return 'the third reef';
  return name || 'a reef';
}

function bottomBlock(lines: string[]): string {
  if (lines.length === 1 && lines[0].startsWith('No change.')) return `BOTTOM LINE\n${lines[0]}`;
  return `BOTTOM LINE\n${lines.map((line, index) => `${index + 1}. ${line}`).join('\n')}`;
}

function fitWords(blocks: string[], maxWords: number): string {
  const chosen = blocks.slice();
  while (countWords(chosen.join('\n\n')) > maxWords && chosen.length > 2) chosen.pop();
  return chosen.join('\n\n');
}

function clock(utcMs: number, timeZone: string | undefined): string {
  const parts = new Intl.DateTimeFormat('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
    ...(timeZone ? { timeZone } : {}),
  }).formatToParts(new Date(utcMs));
  const hour = parts.find(part => part.type === 'hour')?.value ?? '00';
  const minute = parts.find(part => part.type === 'minute')?.value ?? '00';
  return `${hour === '24' ? '00' : hour}:${minute}`;
}

function band(from: number, to: number): string {
  return `${from}\u2013${to}`;
}

function period(text: string): string {
  const trimmed = text.trim();
  return /[.!?]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function signedHpa(value: number): string {
  return value < 0 ? `\u2212${Math.abs(value)}` : String(value);
}

function kn(value: number): number {
  return roundTo(value, COACH_WIND_ROUND_KN);
}

function angle(value: number): number {
  return roundTo(value, COACH_ANGLE_ROUND_DEG);
}

function helm(value: number): number {
  return roundTo(value, COACH_HELM_ROUND_DEG);
}

function hs(value: number): number {
  return roundTo(value, COACH_HS_ROUND_M);
}

function pct(value: number): number {
  return roundTo(value, COACH_PERCENT_ROUND);
}

function round1(value: number): number {
  return Math.round(value * 10) / 10;
}

function roundTo(value: number, step: number): number {
  const rounded = Math.round(value / step) * step;
  const places = step < 1 ? Math.round(-Math.log10(step)) : 0;
  const factor = 10 ** places;
  return Math.round(rounded * factor) / factor;
}

function signed180(deg: number): number {
  const wrapped = ((deg % 360) + 360) % 360;
  return wrapped > 180 ? wrapped - 360 : wrapped;
}

function countWords(text: string): number {
  return text.split(/\s+/).filter(word => word && word !== '·').length;
}

function compareFindings(a: CoachFinding, b: CoachFinding): number {
  return SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity]
    || CONFIDENCE_RANK[a.confidence] - CONFIDENCE_RANK[b.confidence]
    || SECTION_RANK[a.section] - SECTION_RANK[b.section]
    || a.id.localeCompare(b.id);
}
