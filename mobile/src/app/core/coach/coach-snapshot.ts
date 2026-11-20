/**
 * Builds a CoachSnapshot from samples the app already collected.
 * A stale or missing input becomes null. Nothing is filled in with a default.
 * Surf counts, the log residual, and the next sail cutover stay null
 * until the caller supplies the samples those need.
 */

import {
  circularMeanDeg,
  circularSdDeg,
  combinedRudderDeg,
  rmsDemean,
  sampleSd,
  slopePerMinute,
  unwrapDegrees,
  weatherHelmDeg,
  windVmgKnots,
} from '../ab-test/ab-test';
import { bearingDeg, vmgKnots } from '../logbook/logbook-math';
import { SailPlan } from '../models/sail-plan.model';
import { WaveEstimate } from '../waves/wave-estimator';
import {
  CurrentDrift,
  TrackSample,
  helmBiasDeg,
  helmWorkload,
  isNightAt,
  nextCutover,
  pressureTrendHpa,
  solarElevationDeg,
  speedExcursions,
  stwResidualKn,
  stwSensorSuspect,
  SurfSample,
  twsTrendKnPerHour,
} from './coach-features';

export { solarElevationDeg };
import { CoachSnapshot, Stat } from './coach.model';
import {
  COACH_REACH_TWA_MAX_DEG,
  COACH_UPWIND_TWA_MAX_DEG,
  COACH_VMG_DOWNWIND_TWA_DEG,
  COACH_WAVE_LENGTH_M_PER_S2,
  COACH_WAVE_PHASE_SPEED_KN_PER_S,
} from './coach-settings';

export interface CoachStreamSample {
  at: number;
  twsKn?: number | null;
  twaDeg?: number | null;
  signedTwaDeg?: number | null;
  twdDeg?: number | null;
  awsKn?: number | null;
  stwKn?: number | null;
  sogKn?: number | null;
  headingDeg?: number | null;
  cogDeg?: number | null;
  rudderPrimaryRad?: number | null;
  rudderPortRad?: number | null;
  rudderStarboardRad?: number | null;
  pitchRad?: number | null;
  rollRad?: number | null;
  accelZ?: number | null;
  autopilotEngaged?: boolean | null;
  autopilotMode?: string | null;
}

export interface CoachSnapshotInput {
  builtAt: number;
  windowMin: CoachSnapshot['windowMin'];
  vessel: CoachSnapshot['vessel'];
  position?: { lat: number; lon: number } | null;
  destination?: { lat: number; lon: number } | null;
  samples: CoachStreamSample[];
  dataHealth: CoachSnapshot['dataHealth'];
  /** Polar-window percentages already averaged by the polar service. */
  polarPct?: Partial<Record<15 | 30 | 60, number | null>>;
  targetKn?: number | null;
  gust10mKn?: number | null;
  wave?: WaveEstimate | null;
  sails?: Partial<CoachSnapshot['sails']>;
  outlook?: Partial<CoachSnapshot['outlook']>;
  /** Set and drift together. Omitted means the residual cannot be computed. */
  current?: CurrentDrift | null;
  /** One-second polar samples. Omitted means surf counts stay null. */
  polarSamples?: SurfSample[];
  /** Omitted means the next sail cutover stays null. */
  sailPlan?: SailPlan | null;
}

function emptyStat(): Stat {
  return { mean: null, sd: null, slopePerMin: null, n: 0 };
}

export function buildCoachSnapshot(input: CoachSnapshotInput): CoachSnapshot {
  const health = input.dataHealth.map(row => ({ ...row }));
  const fresh = (id: string) => health.some(row => row.input === id && row.status === 'ok');
  const start = input.builtAt - input.windowMin * 60_000;
  const inWindow = input.samples.filter(sample => sample.at >= start && sample.at <= input.builtAt);
  const hourStart = input.builtAt - 60 * 60_000;

  const tws = fresh('tws') ? arithmeticStat(series(inWindow, sample => sample.twsKn)) : emptyStat();
  const twa = fresh('twa') ? arithmeticStat(series(inWindow, sample => sample.twaDeg)) : emptyStat();
  const twd = fresh('twd') ? circularStat(series(inWindow, sample => sample.twdDeg)) : emptyStat();
  const aws = fresh('aws') ? arithmeticStat(series(inWindow, sample => sample.awsKn)) : emptyStat();
  const stw = fresh('stw') ? arithmeticStat(series(inWindow, sample => sample.stwKn)) : emptyStat();
  const sog = fresh('sog') ? arithmeticStat(series(inWindow, sample => sample.sogKn)) : emptyStat();
  const hourTws = fresh('tws')
    ? series(input.samples.filter(sample => sample.at >= hourStart && sample.at <= input.builtAt), sample => sample.twsKn)
    : { t: [], v: [] };
  const speedSource = fresh('stw') && stw.n > 0 ? 'stw' : fresh('sog') && sog.n > 0 ? 'sog' : null;
  const speedsOk = speedSource != null;
  const trackReady = fresh('stw') && fresh('sog') && fresh('heading') && fresh('cog');
  const residual = trackReady ? stwResidualKn(trackSamples(inWindow), input.current ?? null) : null;

  const helm = helmBlock(inWindow, fresh('rudder'), fresh('twa'), fresh('heading'));
  const pilot = fresh('autopilot') ? latestPilot(inWindow) : { engaged: null, mode: null };

  return {
    builtAt: input.builtAt,
    vessel: { ...input.vessel },
    windowMin: input.windowMin,
    isNight: isNightAt(input.position ?? null, input.builtAt),
    pointOfSail: pointOfSail(twa.mean),
    wind: {
      tws,
      twa,
      twd,
      aws,
      gust10mKn: fresh('tws') ? input.gust10mKn ?? null : null,
      gustSpreadKn: fresh('tws') && tws.mean != null && input.gust10mKn != null
        ? input.gust10mKn - tws.mean
        : null,
      twsTrendKnPerHour: twsTrendKnPerHour(hourTws.t, hourTws.v),
    },
    performance: {
      polarPct: {
        15: speedsOk ? input.polarPct?.[15] ?? null : null,
        30: speedsOk ? input.polarPct?.[30] ?? null : null,
        60: speedsOk ? input.polarPct?.[60] ?? null : null,
      },
      targetKn: fresh('tws') && fresh('twa') ? input.targetKn ?? null : null,
      stw,
      sog,
      vmgKn: vmgOf(inWindow, speedSource),
      vmcKn: vmcOf(input, sog, fresh('sog'), fresh('cog')),
      speedSource,
      stwSogResidualKn: residual,
      sensorSuspect: stwSensorSuspect(residual, stw.mean),
    },
    helm: {
      weatherHelmDeg: helm.weather,
      rudderSdDeg: helm.rudderSd,
      headingSdDeg: helm.headingSd,
      autopilotEngaged: pilot.engaged,
      autopilotMode: pilot.mode,
    },
    motion: {
      rmsPitchDeg: fresh('attitude') ? rmsDegrees(numbers(inWindow, sample => sample.pitchRad)) : null,
      rmsRollDeg: fresh('attitude') ? rmsDegrees(numbers(inWindow, sample => sample.rollRad)) : null,
      rmsAccelZ: fresh('accelZ') ? rmsDemean(numbers(inWindow, sample => sample.accelZ)) : null,
    },
    waves: waveBlock(input.wave ?? null, input.builtAt, input.vessel.lWlM),
    downwind: {
      speedExcursions: input.polarSamples
        ? speedExcursions(input.polarSamples, input.windowMin, input.builtAt)
        : null,
      maxStwKn: stw.n > 0 ? Math.max(...numbers(inWindow, sample => sample.stwKn)) : null,
      maxOverTargetPct: overTarget(inWindow, fresh('tws') && fresh('twa') ? input.targetKn ?? null : null, stw.n > 0),
    },
    sails: sailBlock(input, twa, tws, fresh('sails'), fresh('twa'), fresh('tws')),
    outlook: outlookBlock(input.outlook, fresh('pressure')),
    dataHealth: health,
  };
}

function pointOfSail(twa: number | null): CoachSnapshot['pointOfSail'] {
  if (twa == null || !Number.isFinite(twa)) return null;
  const abs = Math.abs(twa);
  if (abs < COACH_UPWIND_TWA_MAX_DEG) return 'upwind';
  if (abs <= COACH_REACH_TWA_MAX_DEG) return 'reach';
  return 'downwind';
}

function series(
  samples: CoachStreamSample[],
  read: (sample: CoachStreamSample) => number | null | undefined,
): { t: number[]; v: number[] } {
  const t: number[] = [];
  const v: number[] = [];
  const ordered = samples.slice().sort((a, b) => a.at - b.at);
  for (const sample of ordered) {
    const value = read(sample);
    if (value == null || !Number.isFinite(value)) continue;
    t.push(sample.at);
    v.push(value);
  }
  return { t, v };
}

function numbers(
  samples: CoachStreamSample[],
  read: (sample: CoachStreamSample) => number | null | undefined,
): number[] {
  return series(samples, read).v;
}

function arithmeticStat(points: { t: number[]; v: number[] }): Stat {
  const { t, v } = points;
  if (!v.length) return emptyStat();
  const mean = v.reduce((sum, value) => sum + value, 0) / v.length;
  return {
    mean,
    sd: v.length >= 2 ? sampleSd(v) : null,
    slopePerMin: slopePerMinute(t, v),
    n: v.length,
  };
}

function circularStat(points: { t: number[]; v: number[] }): Stat {
  const { t, v } = points;
  if (!v.length) return emptyStat();
  return {
    mean: circularMeanDeg(v),
    sd: v.length >= 2 ? circularSdDeg(v) : null,
    slopePerMin: slopePerMinute(t, unwrapDegrees(v)),
    n: v.length,
  };
}

function helmBlock(
  samples: CoachStreamSample[],
  rudderFresh: boolean,
  twaFresh: boolean,
  headingFresh: boolean,
): { weather: Stat | null; rudderSd: number | null; headingSd: number | null } {
  const ordered = samples.slice().sort((a, b) => a.at - b.at);
  const workload = helmWorkload(ordered.map(sample => ({
    at: sample.at,
    headingDeg: headingFresh ? sample.headingDeg ?? null : null,
    rudderDeg: rudderFresh
      ? combinedRudderDeg(
        sample.rudderPrimaryRad ?? null,
        sample.rudderPortRad ?? null,
        sample.rudderStarboardRad ?? null,
      )
      : null,
  })));
  const biasSamples: { twaDeg: number | null; weatherHelmDeg: number | null }[] = [];
  const helm: number[] = [];
  const helmTimes: number[] = [];
  for (const sample of ordered) {
    const angle = combinedRudderDeg(
      sample.rudderPrimaryRad ?? null,
      sample.rudderPortRad ?? null,
      sample.rudderStarboardRad ?? null,
    );
    const weather = angle != null && sample.signedTwaDeg != null
      ? weatherHelmDeg(angle, sample.signedTwaDeg)
      : null;
    biasSamples.push({ twaDeg: sample.twaDeg ?? null, weatherHelmDeg: weather });
    if (weather == null) continue;
    helm.push(weather);
    helmTimes.push(sample.at);
  }
  const bias = twaFresh && rudderFresh ? helmBiasDeg(biasSamples) : null;
  let weather = twaFresh && rudderFresh ? arithmeticStat({ t: helmTimes, v: helm }) : null;
  if (weather && weather.n > 0 && bias == null) weather = null;
  if (weather && bias != null) weather = { ...weather, mean: bias };
  return {
    weather,
    rudderSd: rudderFresh ? workload.rudderSdDeg : null,
    headingSd: headingFresh ? workload.headingSdDeg : null,
  };
}

function latestPilot(samples: CoachStreamSample[]): { engaged: boolean | null; mode: string | null } {
  let engaged: boolean | null = null;
  let mode: string | null = null;
  for (const sample of samples.slice().sort((a, b) => a.at - b.at)) {
    if (typeof sample.autopilotEngaged === 'boolean') engaged = sample.autopilotEngaged;
    if (typeof sample.autopilotMode === 'string' && sample.autopilotMode.trim()) mode = sample.autopilotMode;
  }
  return { engaged, mode };
}

function vmgOf(samples: CoachStreamSample[], source: 'stw' | 'sog' | null): number | null {
  if (!source) return null;
  const values: number[] = [];
  for (const sample of samples) {
    const speed = source === 'stw' ? sample.stwKn : sample.sogKn;
    if (speed == null || sample.twaDeg == null) continue;
    if (!Number.isFinite(speed) || !Number.isFinite(sample.twaDeg)) continue;
    values.push(windVmgKnots(speed, sample.twaDeg, Math.abs(sample.twaDeg) > COACH_VMG_DOWNWIND_TWA_DEG));
  }
  if (!values.length) return null;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function vmcOf(
  input: CoachSnapshotInput,
  sog: Stat,
  sogFresh: boolean,
  cogFresh: boolean,
): number | null {
  const position = input.position ?? null;
  const destination = input.destination ?? null;
  if (!position || !destination || !sogFresh || !cogFresh || sog.mean == null) return null;
  const cog = circularMeanDeg(numbers(
    input.samples.filter(sample => sample.at >= input.builtAt - input.windowMin * 60_000 && sample.at <= input.builtAt),
    sample => sample.cogDeg,
  ));
  if (cog == null) return null;
  return vmgKnots(sog.mean, cog, bearingDeg(position, destination));
}

function trackSamples(samples: CoachStreamSample[]): TrackSample[] {
  const out: TrackSample[] = [];
  for (const sample of samples) {
    if (sample.stwKn == null || sample.headingDeg == null || sample.sogKn == null || sample.cogDeg == null) continue;
    out.push({
      stwKn: sample.stwKn,
      headingDeg: sample.headingDeg,
      sogKn: sample.sogKn,
      cogDeg: sample.cogDeg,
    });
  }
  return out;
}

function overTarget(samples: CoachStreamSample[], targetKn: number | null, haveStw: boolean): number | null {
  if (!haveStw || targetKn == null || !(targetKn > 0)) return null;
  const speeds = numbers(samples, sample => sample.stwKn);
  if (!speeds.length) return null;
  return (Math.max(...speeds) / targetKn - 1) * 100;
}

function rmsDegrees(radians: number[]): number | null {
  return rmsDemean(radians.map(value => value * (180 / Math.PI)));
}

function waveBlock(
  estimate: WaveEstimate | null,
  builtAt: number,
  lWlM: number | null,
): CoachSnapshot['waves'] {
  if (!estimate) {
    return {
      estimate: null,
      ageMin: null,
      wavelengthM: null,
      phaseSpeedKn: null,
      lengthRatio: null,
      steepness: null,
      usable: false,
    };
  }
  const tp = estimate.tpTrue;
  const wavelengthM = tp == null ? null : COACH_WAVE_LENGTH_M_PER_S2 * tp * tp;
  const phaseSpeedKn = tp == null ? null : COACH_WAVE_PHASE_SPEED_KN_PER_S * tp;
  const lengthRatio = wavelengthM != null && lWlM != null && lWlM > 0 ? wavelengthM / lWlM : null;
  const steepness = wavelengthM != null && wavelengthM > 0 && estimate.hs != null
    ? estimate.hs / wavelengthM
    : null;
  const usable = (estimate.confidence === 'high' || estimate.confidence === 'medium') && !estimate.ambiguous;
  const ageMin = Number.isFinite(estimate.time) ? (builtAt - estimate.time) / 60_000 : null;
  return { estimate, ageMin, wavelengthM, phaseSpeedKn, lengthRatio, steepness, usable };
}

function sailBlock(
  input: CoachSnapshotInput,
  twa: Stat,
  tws: Stat,
  sailsFresh: boolean,
  twaFresh: boolean,
  twsFresh: boolean,
): CoachSnapshot['sails'] {
  const sails = input.sails;
  const start = input.builtAt - 30 * 60_000;
  const recent = input.samples.filter(sample => sample.at >= start && sample.at <= input.builtAt);
  const twaSeries = series(recent, sample => sample.twaDeg);
  const twsSeries = series(recent, sample => sample.twsKn);
  const twaSlope = slopePerMinute(twaSeries.t, twaSeries.v);
  const twsSlope = slopePerMinute(twsSeries.t, twsSeries.v);
  return {
    up: sailsFresh ? sails?.up ?? '' : '',
    upChangedAt: sailsFresh ? sails?.upChangedAt ?? null : null,
    advice: sails?.advice ?? null,
    mismatch: {
      15: sails?.mismatch?.[15] ?? null,
      30: sails?.mismatch?.[30] ?? null,
      60: sails?.mismatch?.[60] ?? null,
    },
    nextCutover: input.sailPlan && twaFresh && twsFresh
      ? nextCutover(input.sailPlan, twa.mean, tws.mean, twaSlope, twsSlope)
      : null,
  };
}

function outlookBlock(
  outlook: CoachSnapshotInput['outlook'],
  pressureFresh: boolean,
): CoachSnapshot['outlook'] {
  return {
    pressureHpa: pressureFresh ? outlook?.pressureHpa ?? null : null,
    pressureTrend3hHpa: pressureFresh ? pressureTrendHpa(outlook?.pressureTrend3hHpa) : null,
    nextWatchAt: outlook?.nextWatchAt ?? null,
    nextWatchName: outlook?.nextWatchName ?? null,
    minutesToWatchChange: outlook?.minutesToWatchChange ?? null,
  };
}
