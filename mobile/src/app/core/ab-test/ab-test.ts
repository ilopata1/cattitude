/**
 * A/B sail test.
 *
 * Each part records 6½ minutes. The first 90 seconds settle the boat and stay
 * out of the scores. One or two A/B cycles are compared on VMG as a percentage
 * of the polar, with a confidence that accounts for serial correlation.
 */

export const AB_BLOCK_MS = 6.5 * 60 * 1000;
export const AB_SETTLE_MS = 90 * 1000;
export const AB_SAMPLE_MS = 1000;

const MIN_PERF = 20;
const MIN_SCALAR = 5;

export type AbPhase = 'setup' | 'recording' | 'prepare' | 'rerun' | 'results';
export type AbLegId = 'A' | 'B';
export type AbCycle = 1 | 2;
export type PointOfSail = 'upwind' | 'downwind';

export interface AbSetup {
  variable: string;
  settingA: string;
  settingB: string;
  main: string;
  headsail: string;
  boardPort: string;
  boardStarboard: string;
  trimNotes: string;
  courseDeg: string;
}

export interface AbSample {
  tOffsetMs: number;
  twsKn: number | null;
  twdDeg: number | null;
  stwKn: number | null;
  sogKn: number | null;
  headingDeg: number | null;
  cogDeg: number | null;
  twaDeg: number | null;
  /** True wind angle, positive when the wind is on starboard. */
  signedTwaDeg: number | null;
  /** Rudder angle in degrees, positive when the trailing edge is to starboard. */
  rudderDeg: number | null;
  targetKn: number | null;
  vmgSpeedKn: number | null;
  vmgSpeedSource: 'stw' | 'sog' | null;
  pitchRad: number | null;
  rollRad: number | null;
  heaveM: number | null;
  vertAccel: number | null;
  windMissing: boolean;
  speedMissing: boolean;
  attitudeMissing: boolean;
}

export interface ImuPoint {
  tOffsetMs: number;
  pitchRad?: number;
  rollRad?: number;
  heaveM?: number;
  vertAccel?: number;
}

export interface AbLeg {
  id: AbLegId;
  cycle: AbCycle;
  startedAt: number;
  samples: AbSample[];
  alarms: string[];
  imu: ImuPoint[];
}

export interface AbSession {
  phase: AbPhase;
  setup: AbSetup;
  cycle: AbCycle;
  leg: AbLegId;
  startedAt: number | null;
  legs: AbLeg[];
  liveSamples: AbSample[];
  openAlarms: string[];
  /** High-rate motion samples for the leg in progress. Mutated while recording. */
  imuLive: ImuPoint[];
}

export interface AbPrompt {
  title: string;
  body: string;
  action: string;
}

export interface AbCall {
  winner: 'A' | 'B' | 'tie';
  confidencePct: number | null;
  headline: string;
  detail: string;
}

export interface AbRow {
  kind: 'group' | 'metric';
  label: string;
  a?: string;
  b?: string;
  focus?: boolean;
  ahead?: 'A' | 'B' | null;
}

export interface AbReport {
  variable: string;
  settingA: string;
  settingB: string;
  boatState: string;
  cycles: AbCycle;
  notes: string[];
  vmg: AbCall;
  vmc: AbCall;
  rows: AbRow[];
  alarmLines: string[];
}

export interface Moment {
  mean: number | null;
  sem: number | null;
  nEff: number;
}

interface ScalarStat {
  mean: number | null;
  sd: number | null;
  slope: number | null;
}

interface LegScore {
  mode: PointOfSail;
  twa: number | null;
  vmgPct: Moment;
  vmgKn: Moment;
  vmcKn: Moment;
  windSpeed: ScalarStat;
  windDir: ScalarStat;
  helm: ScalarStat;
  rmsPitch: number | null;
  rmsRoll: number | null;
  rmsAccel: number | null;
  periodS: number | null;
  periodSource: 'pitch' | 'heave' | null;
  setDeg: number | null;
  driftKn: number | null;
  currentNorth: number | null;
  currentEast: number | null;
  scored: number;
  windDropouts: number;
  speedDropouts: number;
  attitudeDropouts: number;
  alarms: string[];
  usedSog: boolean;
}

export function emptySetup(): AbSetup {
  return {
    variable: '',
    settingA: '',
    settingB: '',
    main: '',
    headsail: '',
    boardPort: '',
    boardStarboard: '',
    trimNotes: '',
    courseDeg: '',
  };
}

export function emptySession(): AbSession {
  return {
    phase: 'setup',
    setup: emptySetup(),
    cycle: 1,
    leg: 'A',
    startedAt: null,
    legs: [],
    liveSamples: [],
    openAlarms: [],
    imuLive: [],
  };
}

export function variableLabel(setup: AbSetup): string {
  return setup.variable.trim();
}

export function canStart(setup: AbSetup): boolean {
  const a = setup.settingA.trim();
  const b = setup.settingB.trim();
  return Boolean(variableLabel(setup) && a && b && a !== b);
}

export function boatStateLine(setup: AbSetup): string {
  const parts: string[] = [];
  const main = setup.main.trim();
  if (main) parts.push(main === 'Full' ? 'Full main' : main);
  if (setup.headsail.trim()) parts.push(setup.headsail.trim());
  if (setup.boardPort.trim() || setup.boardStarboard.trim()) {
    parts.push(`Boards ${setup.boardPort.trim() || '—'} / ${setup.boardStarboard.trim() || '—'}`);
  }
  if (setup.trimNotes.trim()) parts.push(setup.trimNotes.trim());
  return parts.join(' · ');
}

export function activeSetting(session: AbSession): string {
  return session.leg === 'B' ? session.setup.settingB : session.setup.settingA;
}

export function preparePrompt(session: AbSession): AbPrompt {
  const setting = activeSetting(session);
  const name = variableLabel(session.setup);
  if (session.leg === 'B') {
    return {
      title: 'Part A is in',
      body: `Set ${name} to ${setting}. Start Part B once that setting is on and the boat is sailing it.`,
      action: 'Start Part B',
    };
  }
  return {
    title: 'Set Part A again',
    body: `Set ${name} back to ${setting}. The entries from the first run stay as they are. Start Part A once the boat is sailing it.`,
    action: 'Start Part A',
  };
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(total / 60);
  const seconds = total % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function elapsedMs(session: AbSession, now: number): number {
  if (session.startedAt == null) return 0;
  return Math.max(0, now - session.startedAt);
}

export function remainingMs(session: AbSession, now: number): number {
  if (session.phase !== 'recording') return AB_BLOCK_MS;
  return Math.max(0, AB_BLOCK_MS - elapsedMs(session, now));
}

export function blockProgress(session: AbSession, now: number): number {
  if (session.phase !== 'recording') return 0;
  return Math.max(0, Math.min(100, (elapsedMs(session, now) / AB_BLOCK_MS) * 100));
}

export function isSettling(session: AbSession, now: number): boolean {
  return session.phase === 'recording' && elapsedMs(session, now) < AB_SETTLE_MS;
}

export function scoredSamples(session: AbSession): number {
  return session.liveSamples.filter((sample) => sample.tOffsetMs >= AB_SETTLE_MS).length;
}

export function absoluteOffBow(directionDeg: number, headingDeg: number): number {
  const relative = ((directionDeg - headingDeg) % 360 + 360) % 360;
  return relative > 180 ? 360 - relative : relative;
}

export function foldSignedDeg(deg: number): number {
  return ((deg + 180) % 360 + 360) % 360 - 180;
}

/**
 * Mean of the rudder sensors, in degrees. A port and starboard pair is averaged.
 * Positive means the trailing edge is to starboard, matching NMEA RSA and PGN 127245.
 */
export function combinedRudderDeg(
  primaryRad: number | null,
  portRad: number | null,
  starboardRad: number | null,
): number | null {
  const toDeg = (rad: number) => rad * (180 / Math.PI);
  if (portRad != null && starboardRad != null) return (toDeg(portRad) + toDeg(starboardRad)) / 2;
  if (primaryRad != null) return toDeg(primaryRad);
  if (portRad != null) return toDeg(portRad);
  if (starboardRad != null) return toDeg(starboardRad);
  return null;
}

/**
 * Rudder angle expressed as weather helm. Positive is weather helm, negative is lee helm.
 * NMEA rudder angle is positive to starboard, so the sign flips with the tack.
 */
export function weatherHelmDeg(rudderDeg: number, signedTwaDeg: number): number | null {
  if (!Number.isFinite(rudderDeg) || !Number.isFinite(signedTwaDeg)) return null;
  const abs = Math.abs(signedTwaDeg);
  if (abs < 1 || abs > 179) return null;
  const starboardTack = signedTwaDeg > 0 ? 1 : -1;
  return -rudderDeg * starboardTack;
}

export function startTest(session: AbSession, setup: AbSetup, now: number): AbSession {
  if (session.phase !== 'setup' || !canStart(setup)) return session;
  return {
    ...emptySession(),
    setup: cleaned(setup),
    phase: 'recording',
    cycle: 1,
    leg: 'A',
    startedAt: now,
  };
}

export function armLeg(session: AbSession, now: number): AbSession {
  if (session.phase !== 'prepare') return session;
  return {
    ...session,
    phase: 'recording',
    startedAt: now,
    liveSamples: [],
    openAlarms: [],
    imuLive: [],
  };
}

export function requestRerun(session: AbSession): AbSession {
  if (session.phase !== 'rerun') return session;
  return { ...session, phase: 'prepare', cycle: 2, leg: 'A' };
}

export function revealResults(session: AbSession): AbSession {
  if (session.phase !== 'rerun') return session;
  return { ...session, phase: 'results' };
}

export function clearTest(session: AbSession): AbSession {
  return { ...emptySession(), setup: session.setup };
}

export function noteAlarm(session: AbSession, message: string): AbSession {
  if (session.phase !== 'recording') return session;
  const text = message.trim() || 'Autopilot alarm';
  return { ...session, openAlarms: [...session.openAlarms, text] };
}

export function tick(session: AbSession, now: number, sample: AbSample | null): AbSession {
  if (session.phase !== 'recording' || session.startedAt == null) return session;
  if (now - session.startedAt >= AB_BLOCK_MS) return finishLeg(session);
  if (!sample) return session;
  return { ...session, liveSamples: [...session.liveSamples, sample] };
}

export function liveVmg(sample: AbSample | null): { pct: number | null; knots: number | null; mode: PointOfSail } | null {
  if (!sample) return null;
  const mode: PointOfSail = sample.twaDeg != null && sample.twaDeg > 90 ? 'downwind' : 'upwind';
  const knots = progressVmg(sample, mode);
  const pct = progressPct(sample, mode);
  if (knots == null && pct == null) return null;
  return { pct, knots, mode };
}

export function meanAndError(values: number[]): Moment {
  if (!values.length) return { mean: null, sem: null, nEff: 0 };
  const mean = average(values);
  if (values.length < 2) return { mean, sem: null, nEff: values.length };
  const sd = sampleSd(values);
  const nEff = effectiveN(values.length, lag1(values));
  return { mean, sem: sd / Math.sqrt(nEff), nEff };
}

/**
 * Chance, from 50 to 100, that the side with the higher mean really is ahead.
 * Standard errors already use an effective sample size, so a gusty minute is
 * not treated as hundreds of independent observations.
 */
export function welchConfidence(
  a: { mean: number; sem: number | null; nEff: number },
  b: { mean: number; sem: number | null; nEff: number },
): number | null {
  const delta = a.mean - b.mean;
  if (!Number.isFinite(delta)) return null;
  if (Math.abs(delta) < 1e-9) return 50;
  if (a.sem == null || b.sem == null) return null;
  const se = Math.hypot(a.sem, b.sem);
  if (se === 0) return 100;
  const t = Math.abs(delta) / se;
  const va = a.sem * a.sem;
  const vb = b.sem * b.sem;
  const denom = (a.nEff > 1 ? (va * va) / (a.nEff - 1) : 0) + (b.nEff > 1 ? (vb * vb) / (b.nEff - 1) : 0);
  if (!(denom > 0)) return null;
  const df = ((va + vb) * (va + vb)) / denom;
  const cdf = studentTCdf(t, df);
  if (!Number.isFinite(cdf)) return null;
  return Math.min(100, Math.max(50, 100 * cdf));
}

/** P(T ≤ t) for Student's t. */
export function studentTCdf(t: number, df: number): number {
  if (!Number.isFinite(t) || !(df > 0)) return NaN;
  const x = df / (df + t * t);
  const ib = regularizedBeta(x, df / 2, 0.5);
  return t >= 0 ? 1 - 0.5 * ib : 0.5 * ib;
}

export function buildReport(session: AbSession): AbReport | null {
  const aLegs = session.legs.filter((leg) => leg.id === 'A');
  const bLegs = session.legs.filter((leg) => leg.id === 'B');
  if (!aLegs.length || !bLegs.length) return null;

  const course = courseOf(session.setup);
  const scoredA = aLegs.map((leg) => scoreLeg(leg, course));
  const scoredB = bLegs.map((leg) => scoreLeg(leg, course));
  const sideA = combineSide(scoredA);
  const sideB = combineSide(scoredB);
  const cycles: AbCycle = session.legs.some((leg) => leg.cycle === 2) ? 2 : 1;

  let vmgBasis: 'pct' | 'knots' = 'pct';
  let vmg = judge('VMG', sideA.vmgPct, sideB.vmgPct, 1, '%', false);
  if (sideA.vmgPct.mean == null || sideB.vmgPct.mean == null) {
    if (sideA.vmgKn.mean != null && sideB.vmgKn.mean != null) {
      vmg = judge('VMG', sideA.vmgKn, sideB.vmgKn, 2, 'kn', true);
      vmg = { ...vmg, detail: `Polar target was missing, so this compares VMG in knots. ${vmg.detail}` };
      vmgBasis = 'knots';
    }
  }
  const vmc = judge('VMC', sideA.vmcKn, sideB.vmcKn, 2, 'kn', true);
  const modes = new Set([...scoredA, ...scoredB].map((score) => score.mode));

  const notes = [
    'Each part runs for 6½ minutes. The first 90 seconds settle the boat and stay out of the scores.',
  ];
  if (cycles === 2) notes.push('The figures are the average of the two cycles.');
  if (modes.size > 1) {
    notes.push('The legs sat on different sides of a beam reach, so each VMG is progress along that leg.');
  } else if (modes.has('downwind')) {
    notes.push('VMG is speed made good downwind.');
  } else {
    notes.push('VMG is speed made good to windward.');
  }
  if (course == null) notes.push('VMC is speed over ground along the same wind axis.');
  else notes.push(`VMC is speed over ground toward ${Math.round(course)}°.`);
  if (sideA.usedSog) notes.push('VMG for A used speed over ground because the log was missing.');
  if (sideB.usedSog) notes.push('VMG for B used speed over ground because the log was missing.');
  if (sideA.helm.mean == null && sideB.helm.mean == null) {
    notes.push('Rudder angle did not arrive, so helm is blank.');
  } else {
    notes.push('Helm is the mean rudder angle. Weather means the rudder is held to stop the bow coming up, and lee means it is held to stop the bow falling off.');
  }

  const pctAhead = vmgBasis === 'pct' && vmg.winner !== 'tie' ? vmg.winner : null;
  const knAhead = vmgBasis === 'knots' && vmg.winner !== 'tie' ? vmg.winner : null;
  const vmcAhead = vmc.winner !== 'tie' ? vmc.winner : null;
  const period = (side: LegScore) => side.periodS == null
    ? '—'
    : `${side.periodS.toFixed(1)} s · ${side.periodSource ?? 'pitch'}`;

  const rows: AbRow[] = [
    { kind: 'group', label: 'Performance' },
    metric('VMG of polar', measure(sideA.vmgPct.mean, 1, '%', false), measure(sideB.vmgPct.mean, 1, '%', false), true, pctAhead),
    metric('VMG', measure(sideA.vmgKn.mean, 2, 'kn', true), measure(sideB.vmgKn.mean, 2, 'kn', true), false, knAhead),
    metric('VMC', measure(sideA.vmcKn.mean, 2, 'kn', true), measure(sideB.vmcKn.mean, 2, 'kn', true), false, vmcAhead),
    metric('Mean TWA', measure(sideA.twa, 0, '°', false), measure(sideB.twa, 0, '°', false)),
    { kind: 'group', label: 'Helm' },
    metric('Helm', formatHelm(sideA.helm.mean), formatHelm(sideB.helm.mean)),
    metric('Helm spread', measure(sideA.helm.sd, 1, '°', false), measure(sideB.helm.sd, 1, '°', false)),
    { kind: 'group', label: 'Wind' },
    metric('Wind speed', measure(sideA.windSpeed.mean, 1, 'kn', true), measure(sideB.windSpeed.mean, 1, 'kn', true)),
    metric('Gustiness', measure(sideA.windSpeed.sd, 1, 'kn', true), measure(sideB.windSpeed.sd, 1, 'kn', true)),
    metric('Wind slope', slope(sideA.windSpeed.slope, 2, 'kn/min'), slope(sideB.windSpeed.slope, 2, 'kn/min')),
    metric('Wind direction', measure(sideA.windDir.mean, 0, '°', false), measure(sideB.windDir.mean, 0, '°', false)),
    metric('Direction spread', measure(sideA.windDir.sd, 0, '°', false), measure(sideB.windDir.sd, 0, '°', false)),
    metric('Direction slope', slope(sideA.windDir.slope, 1, '°/min'), slope(sideB.windDir.slope, 1, '°/min')),
    { kind: 'group', label: 'Sea' },
    metric('Pitch', measure(sideA.rmsPitch, 1, '°', false), measure(sideB.rmsPitch, 1, '°', false)),
    metric('Roll', measure(sideA.rmsRoll, 1, '°', false), measure(sideB.rmsRoll, 1, '°', false)),
    metric('Vertical accel', measure(sideA.rmsAccel, 2, 'm/s²', true), measure(sideB.rmsAccel, 2, 'm/s²', true)),
    metric('Dominant period', period(sideA), period(sideB)),
    { kind: 'group', label: 'Current' },
    metric('Set', measure(sideA.setDeg, 0, '°', false), measure(sideB.setDeg, 0, '°', false)),
    metric('Drift', measure(sideA.driftKn, 2, 'kn', true), measure(sideB.driftKn, 2, 'kn', true)),
    { kind: 'group', label: 'Data quality' },
    metric('Scored samples', String(sideA.scored), String(sideB.scored)),
    metric('Wind dropouts', String(sideA.windDropouts), String(sideB.windDropouts)),
    metric('Speed dropouts', String(sideA.speedDropouts), String(sideB.speedDropouts)),
    metric('Attitude dropouts', String(sideA.attitudeDropouts), String(sideB.attitudeDropouts)),
  ];

  return {
    variable: variableLabel(session.setup),
    settingA: session.setup.settingA,
    settingB: session.setup.settingB,
    boatState: boatStateLine(session.setup),
    cycles,
    notes,
    vmg,
    vmc,
    rows,
    alarmLines: [alarmLine('A', sideA.alarms), alarmLine('B', sideB.alarms)].filter((line): line is string => !!line),
  };
}

function metric(label: string, a: string, b: string, focus = false, ahead: 'A' | 'B' | null = null): AbRow {
  return { kind: 'metric', label, a, b, focus, ahead };
}

function finishLeg(session: AbSession): AbSession {
  const leg: AbLeg = {
    id: session.leg,
    cycle: session.cycle,
    startedAt: session.startedAt ?? 0,
    samples: session.liveSamples,
    alarms: session.openAlarms,
    imu: [...session.imuLive],
  };
  const cleared: AbSession = {
    ...session,
    legs: [...session.legs, leg],
    liveSamples: [],
    openAlarms: [],
    imuLive: [],
    startedAt: null,
  };
  if (session.leg === 'A') return { ...cleared, phase: 'prepare', leg: 'B' };
  if (session.cycle === 1) return { ...cleared, phase: 'rerun', leg: 'B' };
  return { ...cleared, phase: 'results', leg: 'B' };
}

function cleaned(setup: AbSetup): AbSetup {
  return {
    variable: setup.variable.trim(),
    settingA: setup.settingA.trim(),
    settingB: setup.settingB.trim(),
    main: setup.main.trim(),
    headsail: setup.headsail.trim(),
    boardPort: setup.boardPort.trim(),
    boardStarboard: setup.boardStarboard.trim(),
    trimNotes: setup.trimNotes.trim(),
    courseDeg: String(setup.courseDeg ?? '').trim(),
  };
}

function courseOf(setup: AbSetup): number | null {
  const raw = String(setup.courseDeg ?? '').trim();
  if (!raw) return null;
  const value = Number(raw);
  if (!Number.isFinite(value)) return null;
  return ((value % 360) + 360) % 360;
}

function scoreLeg(leg: AbLeg, course: number | null): LegScore {
  const window = scored(leg.samples).sort((a, b) => a.tOffsetMs - b.tOffsetMs);
  const twa = averageOrNull(finite(window.map((sample) => sample.twaDeg)));
  const mode: PointOfSail = twa != null && twa > 90 ? 'downwind' : 'upwind';
  const wind = pairs(window, (sample) => sample.twsKn);
  const direction = pairs(window, (sample) => sample.twdDeg);
  const helm = pairs(window, sampleHelm);
  const sea = seaStats(leg.samples, leg.imu);
  const current = currentVector(window);
  const setDrift = current ? vectorToSetDrift(current.north, current.east) : { setDeg: null, driftKn: null };
  let sogCount = 0;
  let speedCount = 0;
  let windDropouts = 0;
  let speedDropouts = 0;
  let attitudeDropouts = 0;
  for (const sample of window) {
    if (sample.windMissing) windDropouts += 1;
    if (sample.speedMissing) speedDropouts += 1;
    if (sample.attitudeMissing) attitudeDropouts += 1;
    if (sample.vmgSpeedSource == null) continue;
    speedCount += 1;
    if (sample.vmgSpeedSource === 'sog') sogCount += 1;
  }
  return {
    mode,
    twa,
    vmgPct: gated(finite(window.map((sample) => progressPct(sample, mode)))),
    vmgKn: gated(finite(window.map((sample) => progressVmg(sample, mode)))),
    vmcKn: gated(finite(window.map((sample) => progressVmc(sample, mode, course)))),
    windSpeed: scalarStats(wind.t, wind.v),
    windDir: directionStats(direction.t, direction.v),
    helm: scalarStats(helm.t, helm.v),
    rmsPitch: sea.rmsPitch,
    rmsRoll: sea.rmsRoll,
    rmsAccel: sea.rmsAccel,
    periodS: sea.periodS,
    periodSource: sea.periodSource,
    setDeg: setDrift.setDeg,
    driftKn: setDrift.driftKn,
    currentNorth: current?.north ?? null,
    currentEast: current?.east ?? null,
    scored: window.length,
    windDropouts,
    speedDropouts,
    attitudeDropouts,
    alarms: leg.alarms,
    usedSog: speedCount > 0 && sogCount / speedCount >= 0.5,
  };
}

function combineSide(parts: LegScore[]): LegScore {
  const sea = combineSea(parts);
  const current = combineCurrent(parts);
  const twas = finite(parts.map((part) => part.twa));
  const twa = averageOrNull(twas);
  return {
    mode: twa != null && twa > 90 ? 'downwind' : 'upwind',
    twa,
    vmgPct: combineMoments(parts.map((part) => part.vmgPct)),
    vmgKn: combineMoments(parts.map((part) => part.vmgKn)),
    vmcKn: combineMoments(parts.map((part) => part.vmcKn)),
    windSpeed: combineScalar(parts.map((part) => part.windSpeed)),
    windDir: combineDirection(parts.map((part) => part.windDir)),
    helm: combineScalar(parts.map((part) => part.helm)),
    rmsPitch: sea.rmsPitch,
    rmsRoll: sea.rmsRoll,
    rmsAccel: sea.rmsAccel,
    periodS: sea.periodS,
    periodSource: sea.periodSource,
    setDeg: current.setDeg,
    driftKn: current.driftKn,
    currentNorth: null,
    currentEast: null,
    scored: parts.reduce((sum, part) => sum + part.scored, 0),
    windDropouts: parts.reduce((sum, part) => sum + part.windDropouts, 0),
    speedDropouts: parts.reduce((sum, part) => sum + part.speedDropouts, 0),
    attitudeDropouts: parts.reduce((sum, part) => sum + part.attitudeDropouts, 0),
    alarms: parts.reduce<string[]>((all, part) => all.concat(part.alarms), []),
    usedSog: parts.some((part) => part.usedSog),
  };
}

function combineMoments(parts: Moment[]): Moment {
  const ready = parts.filter((part): part is Moment & { mean: number } => part.mean != null);
  if (!ready.length) return { mean: null, sem: null, nEff: 0 };
  if (ready.length === 1) return ready[0];
  const mean = average(ready.map((part) => part.mean));
  const nEff = ready.reduce((sum, part) => sum + part.nEff, 0);
  if (ready.some((part) => part.sem == null)) return { mean, sem: null, nEff };
  const sem = Math.sqrt(ready.reduce((sum, part) => sum + (part.sem as number) ** 2, 0)) / ready.length;
  return { mean, sem, nEff };
}

function combineScalar(parts: ScalarStat[]): ScalarStat {
  return {
    mean: averageOrNull(finite(parts.map((part) => part.mean))),
    sd: averageOrNull(finite(parts.map((part) => part.sd))),
    slope: averageOrNull(finite(parts.map((part) => part.slope))),
  };
}

function combineDirection(parts: ScalarStat[]): ScalarStat {
  const means = finite(parts.map((part) => part.mean));
  return {
    mean: means.length ? circularMeanDeg(means) : null,
    sd: averageOrNull(finite(parts.map((part) => part.sd))),
    slope: averageOrNull(finite(parts.map((part) => part.slope))),
  };
}

function combineSea(parts: LegScore[]): Pick<LegScore, 'rmsPitch' | 'rmsRoll' | 'rmsAccel' | 'periodS' | 'periodSource'> {
  const pitch = finite(parts.filter((part) => part.periodSource === 'pitch').map((part) => part.periodS));
  const heave = finite(parts.filter((part) => part.periodSource === 'heave').map((part) => part.periodS));
  const periodSource = pitch.length ? 'pitch' : heave.length ? 'heave' : null;
  return {
    rmsPitch: averageOrNull(finite(parts.map((part) => part.rmsPitch))),
    rmsRoll: averageOrNull(finite(parts.map((part) => part.rmsRoll))),
    rmsAccel: averageOrNull(finite(parts.map((part) => part.rmsAccel))),
    periodS: periodSource === 'pitch' ? average(pitch) : periodSource === 'heave' ? average(heave) : null,
    periodSource,
  };
}

function combineCurrent(parts: LegScore[]): { setDeg: number | null; driftKn: number | null } {
  const ready = parts.filter((part) => part.currentNorth != null && part.currentEast != null);
  if (!ready.length) return { setDeg: null, driftKn: null };
  return vectorToSetDrift(
    average(ready.map((part) => part.currentNorth as number)),
    average(ready.map((part) => part.currentEast as number)),
  );
}

function judge(name: string, a: Moment, b: Moment, digits: number, unit: string, space: boolean): AbCall {
  if (a.mean == null || b.mean == null) {
    return {
      winner: 'tie',
      confidencePct: null,
      headline: `${name} needs more steady data`,
      detail: 'Wind, boat speed, or the polar was missing for too much of the scored time.',
    };
  }
  const confidence = welchConfidence(
    { mean: a.mean, sem: a.sem, nEff: a.nEff },
    { mean: b.mean, sem: b.sem, nEff: b.nEff },
  );
  const rounded = confidence == null ? null : Math.round(confidence);
  const gap = unit === '%' ? 0.05 : 0.005;
  const winner: 'A' | 'B' | 'tie' = Math.abs(a.mean - b.mean) < gap ? 'tie' : a.mean > b.mean ? 'A' : 'B';
  const summary = `A ${measure(a.mean, digits, unit, space)}, B ${measure(b.mean, digits, unit, space)}.`;
  if (winner === 'tie') {
    return {
      winner,
      confidencePct: rounded ?? 50,
      headline: `${name} is level`,
      detail: rounded == null ? summary : `${summary} Confidence ${rounded}%.`,
    };
  }
  return {
    winner,
    confidencePct: rounded,
    headline: rounded != null && rounded < 70 ? `${winner} is slightly ahead on ${name}` : `${winner} is ahead on ${name}`,
    detail: rounded == null ? summary : `${summary} Confidence ${rounded}%.`,
  };
}

function sampleHelm(sample: AbSample): number | null {
  if (sample.rudderDeg == null) return null;
  const signed = sample.signedTwaDeg != null
    ? sample.signedTwaDeg
    : sample.headingDeg != null && sample.twdDeg != null
      ? signedDelta(sample.headingDeg, sample.twdDeg)
      : null;
  if (signed == null) return null;
  return weatherHelmDeg(sample.rudderDeg, signed);
}

function formatHelm(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const abs = Math.abs(value);
  if (abs < 0.05) return '0.0°';
  return `${abs.toFixed(1)}° ${value > 0 ? 'weather' : 'lee'}`;
}

function progressVmg(sample: AbSample, mode: PointOfSail): number | null {
  if (sample.vmgSpeedKn == null || sample.twaDeg == null) return null;
  const upwind = sample.vmgSpeedKn * Math.cos((sample.twaDeg * Math.PI) / 180);
  return mode === 'downwind' ? -upwind : upwind;
}

function progressPct(sample: AbSample, mode: PointOfSail): number | null {
  const actual = progressVmg(sample, mode);
  if (actual == null || sample.targetKn == null || sample.twaDeg == null) return null;
  const upwind = sample.targetKn * Math.cos((sample.twaDeg * Math.PI) / 180);
  const target = mode === 'downwind' ? -upwind : upwind;
  if (!(target > 0.2)) return null;
  return (100 * actual) / target;
}

function progressVmc(sample: AbSample, mode: PointOfSail, course: number | null): number | null {
  if (sample.sogKn == null || sample.cogDeg == null) return null;
  if (course != null) return sample.sogKn * Math.cos(((sample.cogDeg - course) * Math.PI) / 180);
  if (sample.twdDeg == null) return null;
  const upwind = sample.sogKn * Math.cos(((sample.cogDeg - sample.twdDeg) * Math.PI) / 180);
  return mode === 'downwind' ? -upwind : upwind;
}

function currentVector(samples: AbSample[]): { north: number; east: number } | null {
  let north = 0;
  let east = 0;
  let count = 0;
  for (const sample of samples) {
    if (sample.stwKn == null || sample.sogKn == null || sample.headingDeg == null || sample.cogDeg == null) continue;
    const heading = (sample.headingDeg * Math.PI) / 180;
    const cog = (sample.cogDeg * Math.PI) / 180;
    north += sample.sogKn * Math.cos(cog) - sample.stwKn * Math.cos(heading);
    east += sample.sogKn * Math.sin(cog) - sample.stwKn * Math.sin(heading);
    count += 1;
  }
  if (!count) return null;
  return { north: north / count, east: east / count };
}

function vectorToSetDrift(north: number, east: number): { setDeg: number; driftKn: number } {
  return {
    driftKn: Math.hypot(north, east),
    setDeg: (Math.atan2(east, north) * 180 / Math.PI + 360) % 360,
  };
}

function seaStats(samples: AbSample[], imu: ImuPoint[]): Pick<LegScore, 'rmsPitch' | 'rmsRoll' | 'rmsAccel' | 'periodS' | 'periodSource'> {
  const pitch = channel(imu, samples, (point) => point.pitchRad, (sample) => sample.pitchRad);
  const roll = channel(imu, samples, (point) => point.rollRad, (sample) => sample.rollRad);
  const heave = channel(imu, samples, (point) => point.heaveM, (sample) => sample.heaveM);
  const accel = channel(imu, samples, (point) => point.vertAccel, (sample) => sample.vertAccel);
  const rmsPitch = rmsDegrees(pitch);
  const rmsRoll = rmsDegrees(roll);
  let rmsAccel = rmsDemean(accel.map((point) => point.v));
  if (rmsAccel == null) rmsAccel = rmsDemean(derivedAccel(heave));
  const pitchGrid = resampleUniform(pitch, 4);
  const heaveGrid = resampleUniform(heave, 4);
  const pitchPeriod = pitchGrid && rmsPitch != null && rmsPitch >= 0.05
    ? dominantPeriodSeconds(pitchGrid.values, pitchGrid.dtS)
    : null;
  if (pitchPeriod != null) {
    return { rmsPitch, rmsRoll, rmsAccel, periodS: pitchPeriod, periodSource: 'pitch' };
  }
  const heavePeriod = heaveGrid ? dominantPeriodSeconds(heaveGrid.values, heaveGrid.dtS) : null;
  return {
    rmsPitch,
    rmsRoll,
    rmsAccel,
    periodS: heavePeriod,
    periodSource: heavePeriod == null ? null : 'heave',
  };
}

function channel(
  imu: ImuPoint[],
  samples: AbSample[],
  readImu: (point: ImuPoint) => number | undefined,
  readSample: (sample: AbSample) => number | null,
): { t: number; v: number }[] {
  const fromImu = scored(imu)
    .filter((point) => readImu(point) != null && Number.isFinite(readImu(point)))
    .map((point) => ({ t: point.tOffsetMs, v: readImu(point) as number }));
  if (fromImu.length >= 16) return fromImu;
  return scored(samples)
    .filter((sample) => readSample(sample) != null && Number.isFinite(readSample(sample)))
    .map((sample) => ({ t: sample.tOffsetMs, v: readSample(sample) as number }));
}

function rmsDegrees(points: { v: number }[]): number | null {
  return rmsDemean(points.map((point) => (point.v * 180) / Math.PI));
}

function rmsDemean(values: number[]): number | null {
  if (values.length < 16) return null;
  const mean = average(values);
  let sum = 0;
  for (const value of values) {
    const delta = value - mean;
    sum += delta * delta;
  }
  return Math.sqrt(sum / values.length);
}

function resampleUniform(points: { t: number; v: number }[], hz: number): { values: number[]; dtS: number } | null {
  if (points.length < 16) return null;
  const sorted = points.slice().sort((a, b) => a.t - b.t);
  const start = sorted[0].t;
  const span = sorted[sorted.length - 1].t - start;
  const dtMs = 1000 / hz;
  const bins = Math.floor(span / dtMs);
  if (bins < 64) return null;
  const values = new Array<number>(bins);
  let index = 0;
  let hold = sorted[0].v;
  for (let bin = 0; bin < bins; bin++) {
    const end = start + (bin + 1) * dtMs;
    let sum = 0;
    let count = 0;
    while (index < sorted.length && sorted[index].t < end) {
      sum += sorted[index].v;
      count += 1;
      hold = sorted[index].v;
      index += 1;
    }
    values[bin] = count ? sum / count : hold;
  }
  return { values, dtS: 1 / hz };
}

function derivedAccel(points: { t: number; v: number }[]): number[] {
  if (points.length < 16) return [];
  const sorted = points.slice().sort((a, b) => a.t - b.t);
  const steps: number[] = [];
  for (let i = 1; i < sorted.length; i++) steps.push(sorted[i].t - sorted[i - 1].t);
  steps.sort((a, b) => a - b);
  const median = steps[Math.floor(steps.length / 2)] ?? 0;
  if (median > 0 && median < 200) {
    const grid = resampleUniform(sorted, 4);
    return grid ? secondDerivative(grid.values, grid.dtS) : [];
  }
  const out: number[] = [];
  for (let i = 1; i < sorted.length - 1; i++) {
    const before = (sorted[i].t - sorted[i - 1].t) / 1000;
    const after = (sorted[i + 1].t - sorted[i].t) / 1000;
    if (!(before > 0) || !(after > 0)) continue;
    const rise = (sorted[i].v - sorted[i - 1].v) / before;
    const fall = (sorted[i + 1].v - sorted[i].v) / after;
    out.push((fall - rise) / ((before + after) / 2));
  }
  return out;
}

function secondDerivative(values: number[], dtS: number): number[] {
  const out: number[] = [];
  const step = dtS * dtS;
  if (!(step > 0)) return out;
  for (let i = 1; i < values.length - 1; i++) {
    out.push((values[i + 1] - 2 * values[i] + values[i - 1]) / step);
  }
  return out;
}

function dominantPeriodSeconds(values: number[], dtS: number): number | null {
  const n = values.length;
  if (n < 64 || !(dtS > 0)) return null;
  const mean = average(values);
  const windowed = values.map((value, index) => {
    const hann = 0.5 - 0.5 * Math.cos((2 * Math.PI * index) / (n - 1));
    return (value - mean) * hann;
  });
  let kMin = Math.max(1, Math.ceil((n * dtS) / 20));
  let kMax = Math.min(Math.floor((n * dtS) / 2), Math.floor(n / 2) - 1);
  if (kMax < kMin) return null;
  let best = 0;
  let bestK = 0;
  for (let k = kMin; k <= kMax; k++) {
    const omega = (2 * Math.PI * k) / n;
    let real = 0;
    let imag = 0;
    for (let i = 0; i < n; i++) {
      real += windowed[i] * Math.cos(omega * i);
      imag -= windowed[i] * Math.sin(omega * i);
    }
    const power = real * real + imag * imag;
    if (power > best) {
      best = power;
      bestK = k;
    }
  }
  if (!(bestK > 0)) return null;
  return (n * dtS) / bestK;
}

function scalarStats(times: number[], values: number[]): ScalarStat {
  if (values.length < MIN_SCALAR) return { mean: null, sd: null, slope: null };
  return { mean: average(values), sd: sampleSd(values), slope: slopePerMinute(times, values) };
}

function directionStats(times: number[], degrees: number[]): ScalarStat {
  if (degrees.length < MIN_SCALAR) return { mean: null, sd: null, slope: null };
  return {
    mean: circularMeanDeg(degrees),
    sd: circularSdDeg(degrees),
    slope: slopePerMinute(times, unwrapDegrees(degrees)),
  };
}

function pairs(samples: AbSample[], read: (sample: AbSample) => number | null): { t: number[]; v: number[] } {
  const t: number[] = [];
  const v: number[] = [];
  for (const sample of samples) {
    const value = read(sample);
    if (value == null || !Number.isFinite(value)) continue;
    t.push(sample.tOffsetMs);
    v.push(value);
  }
  return { t, v };
}

function gated(values: number[]): Moment {
  if (values.length < MIN_PERF) return { mean: null, sem: null, nEff: values.length };
  return meanAndError(values);
}

function scored<T extends { tOffsetMs: number }>(points: T[]): T[] {
  return points.filter((point) => point.tOffsetMs >= AB_SETTLE_MS && point.tOffsetMs < AB_BLOCK_MS);
}

function slopePerMinute(timesMs: number[], values: number[]): number | null {
  const n = values.length;
  if (n < 3 || timesMs.length !== n) return null;
  let sumT = 0;
  let sumY = 0;
  let sumTT = 0;
  let sumTY = 0;
  for (let i = 0; i < n; i++) {
    const t = timesMs[i] / 60000;
    sumT += t;
    sumY += values[i];
    sumTT += t * t;
    sumTY += t * values[i];
  }
  const den = n * sumTT - sumT * sumT;
  if (Math.abs(den) < 1e-9) return null;
  return (n * sumTY - sumT * sumY) / den;
}

function circularMeanDeg(degrees: number[]): number | null {
  if (!degrees.length) return null;
  let sin = 0;
  let cos = 0;
  for (const degree of degrees) {
    const rad = (degree * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  return (Math.atan2(sin, cos) * 180 / Math.PI + 360) % 360;
}

function circularSdDeg(degrees: number[]): number | null {
  if (degrees.length < 2) return null;
  let sin = 0;
  let cos = 0;
  for (const degree of degrees) {
    const rad = (degree * Math.PI) / 180;
    sin += Math.sin(rad);
    cos += Math.cos(rad);
  }
  const radius = Math.hypot(sin, cos) / degrees.length;
  if (radius >= 0.999999) return 0;
  if (!(radius > 0)) return null;
  return Math.sqrt(-2 * Math.log(radius)) * (180 / Math.PI);
}

function unwrapDegrees(degrees: number[]): number[] {
  if (!degrees.length) return [];
  const out = [degrees[0]];
  for (let i = 1; i < degrees.length; i++) {
    out.push(out[i - 1] + signedDelta(out[i - 1], degrees[i]));
  }
  return out;
}

function signedDelta(from: number, to: number): number {
  return ((normalize(to - from) + 180) % 360) - 180;
}

function normalize(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function alarmLine(side: AbLegId, alarms: string[]): string | null {
  if (!alarms.length) return null;
  const unique: string[] = [];
  const seen = new Set<string>();
  for (const alarm of alarms) {
    if (seen.has(alarm)) continue;
    seen.add(alarm);
    unique.push(alarm);
  }
  const shown = unique.slice(0, 3).join('; ');
  const noun = alarms.length === 1 ? 'alarm' : 'alarms';
  return shown ? `${side}: ${alarms.length} autopilot ${noun} — ${shown}` : `${side}: ${alarms.length} autopilot ${noun}`;
}

function measure(value: number | null, digits: number, unit: string, space: boolean): string {
  if (value == null || !Number.isFinite(value)) return '—';
  return `${value.toFixed(digits)}${space ? ' ' : ''}${unit}`;
}

function slope(value: number | null, digits: number, unit: string): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const sign = value > 0 ? '+' : '';
  return `${sign}${value.toFixed(digits)} ${unit}`;
}

function average(values: number[]): number {
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function averageOrNull(values: number[]): number | null {
  return values.length ? average(values) : null;
}

function finite(values: Array<number | null | undefined>): number[] {
  const out: number[] = [];
  for (const value of values) {
    if (value != null && Number.isFinite(value)) out.push(value);
  }
  return out;
}

function sampleSd(values: number[]): number {
  if (values.length < 2) return 0;
  const mean = average(values);
  let sum = 0;
  for (const value of values) {
    const delta = value - mean;
    sum += delta * delta;
  }
  return Math.sqrt(sum / (values.length - 1));
}

function correlation(a: number[], b: number[]): number {
  const n = Math.min(a.length, b.length);
  if (n < 2) return 0;
  let sumA = 0;
  let sumB = 0;
  for (let i = 0; i < n; i++) {
    sumA += a[i];
    sumB += b[i];
  }
  const meanA = sumA / n;
  const meanB = sumB / n;
  let num = 0;
  let denA = 0;
  let denB = 0;
  for (let i = 0; i < n; i++) {
    const da = a[i] - meanA;
    const db = b[i] - meanB;
    num += da * db;
    denA += da * da;
    denB += db * db;
  }
  if (denA === 0 || denB === 0) return 0;
  return num / Math.sqrt(denA * denB);
}

function lag1(values: number[]): number {
  if (values.length < 3) return 0;
  return correlation(values.slice(0, -1), values.slice(1));
}

/** Positive autocorrelation shrinks the effective sample size. Negative correlation does not inflate it. */
function effectiveN(n: number, rho: number): number {
  const r = Math.max(0, Math.min(0.95, rho));
  return Math.max(2, Math.min(n, (n * (1 - r)) / (1 + r)));
}

function logGamma(z: number): number {
  if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - logGamma(1 - z);
  const p = [
    0.99999999999980993,
    676.5203681218851,
    -1259.1392167224028,
    771.32342877765313,
    -176.61502916214059,
    12.507343278686905,
    -0.13857109526572012,
    9.9843696540789808e-6,
    1.5056327351493116e-7,
  ];
  let x = p[0];
  const shifted = z - 1;
  for (let i = 1; i < p.length; i++) x += p[i] / (shifted + i);
  const t = shifted + 7.5;
  return 0.5 * Math.log(2 * Math.PI) + (shifted + 0.5) * Math.log(t) - t + Math.log(x);
}

function betacf(a: number, b: number, x: number): number {
  const qab = a + b;
  const qap = a + 1;
  const qam = a - 1;
  let c = 1;
  let d = 1 - (qab * x) / qap;
  if (Math.abs(d) < 1e-30) d = 1e-30;
  d = 1 / d;
  let h = d;
  for (let m = 1; m <= 200; m++) {
    const m2 = 2 * m;
    let aa = (m * (b - m) * x) / ((qam + m2) * (a + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    h *= d * c;
    aa = (-(a + m) * (qab + m) * x) / ((a + m2) * (qap + m2));
    d = 1 + aa * d;
    if (Math.abs(d) < 1e-30) d = 1e-30;
    c = 1 + aa / c;
    if (Math.abs(c) < 1e-30) c = 1e-30;
    d = 1 / d;
    const del = d * c;
    h *= del;
    if (Math.abs(del - 1) < 3e-12) break;
  }
  return h;
}

function regularizedBeta(x: number, a: number, b: number): number {
  if (x <= 0) return 0;
  if (x >= 1) return 1;
  const bt = Math.exp(logGamma(a + b) - logGamma(a) - logGamma(b) + a * Math.log(x) + b * Math.log(1 - x));
  if (x < (a + 1) / (a + b + 2)) return (bt * betacf(a, b, x)) / a;
  return 1 - (bt * betacf(b, a, 1 - x)) / b;
}
