import { slopePerMinute, windVmgKnots } from '../ab-test/ab-test';
import { emptyEstimate, WaveEstimate } from '../waves/wave-estimator';
import { CoachSnapshot, Stat } from './coach.model';
import { CoachSnapshotInput, CoachStreamSample, buildCoachSnapshot, solarElevationDeg } from './coach-snapshot';
import {
  COACH_NIGHT_ELEVATION_MAX_DEG,
  COACH_WAVE_LENGTH_M_PER_S2,
  COACH_WAVE_PHASE_SPEED_KN_PER_S,
} from './coach-settings';

export function coachSnapshotFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const noon = Date.UTC(2026, 5, 21, 12, 0, 0);
  const midnight = Date.UTC(2026, 5, 21, 0, 0, 0);
  const position = { lat: 50, lon: 0 };
  expect(
    solarElevationDeg(position.lat, position.lon, noon) >= COACH_NIGHT_ELEVATION_MAX_DEG,
    'midsummer noon at 50°N is above the night line',
  );
  expect(
    solarElevationDeg(position.lat, position.lon, midnight) < COACH_NIGHT_ELEVATION_MAX_DEG,
    'midsummer midnight at 50°N is night',
  );

  const steady = steadyInput(noon);
  const beat = buildCoachSnapshot(steady);
  expect(beat.isNight === false, 'the noon snapshot is daytime');
  expect(beat.pointOfSail === 'upwind', `60° is upwind, got ${beat.pointOfSail}`);
  expectStat(failures, 'steady TWS', beat.wind.tws, 14, 0, 0, 3);
  expectStat(failures, 'steady TWA', beat.wind.twa, 60, 0, 0, 3);
  expect(close(beat.wind.twd.mean, 220), `TWD mean, got ${beat.wind.twd.mean}`);
  expect(beat.wind.aws.mean === 18, `AWS mean, got ${beat.wind.aws.mean}`);
  expect(beat.wind.gust10mKn === 16 && beat.wind.gustSpreadKn === 2, `gust spread, got ${beat.wind.gustSpreadKn}`);
  expect(beat.wind.twsTrendKnPerHour === 0, `a flat hour has no trend, got ${beat.wind.twsTrendKnPerHour}`);
  expect(beat.performance.polarPct[15] === 90 && beat.performance.polarPct[30] === 91 && beat.performance.polarPct[60] === 92, 'polar windows pass through');
  expect(beat.performance.targetKn === 8, `target, got ${beat.performance.targetKn}`);
  expect(beat.performance.stw.mean === 8 && beat.performance.sog.mean === 8, 'both speeds are 8 kn');
  expect(beat.performance.vmgKn === windVmgKnots(8, 60, false), `VMG at 60°, got ${beat.performance.vmgKn}`);
  expect(beat.performance.vmcKn === 8, `VMC straight at the mark, got ${beat.performance.vmcKn}`);
  expect(beat.performance.speedSource === 'stw', `speed source, got ${beat.performance.speedSource}`);
  expect(beat.performance.stwSogResidualKn == null, 'the residual waits for the derived-features pass');
  expectStat(failures, 'weather helm', beat.helm.weatherHelmDeg, 3, 0, 0, 3);
  expect(beat.helm.rudderSdDeg === 0 && beat.helm.headingSdDeg === 0, 'a steady helm has no spread');
  expect(beat.helm.autopilotEngaged === true && beat.helm.autopilotMode === 'auto', 'autopilot state is kept');
  expect(beat.motion.rmsPitchDeg === 0, `flat pitch RMS, got ${beat.motion.rmsPitchDeg}`);
  expect(beat.motion.rmsRollDeg == null, 'roll with no samples stays null');
  expect(beat.motion.rmsAccelZ == null, 'a missing accelerometer is not given a number');
  expect(beat.waves.estimate == null && beat.waves.usable === false, 'no wave estimate is not usable');
  expect(beat.downwind.maxStwKn === 8 && beat.downwind.maxOverTargetPct === 0, 'peak STW matches the target');
  expect(beat.downwind.speedExcursions == null, 'surf counts wait for the derived-features pass');
  expect(beat.sails.up === 'full main + jib' && beat.sails.nextCutover == null, 'sails up are copied, cutover is not invented');
  expect(beat.outlook.pressureHpa === 1013 && beat.outlook.pressureTrend3hHpa === -1, 'pressure is copied when it is fresh');
  expect(beat.dataHealth !== steady.dataHealth, 'the snapshot keeps its own health list');
  expect(beat.vessel.hullType === 'cat' && beat.vessel.hasDaggerboards === false, 'the vessel is copied, not assumed');

  const dark = buildCoachSnapshot({ ...steady, builtAt: midnight, samples: steady.samples.map(sample => ({ ...sample, at: sample.at - (noon - midnight) })) });
  expect(dark.isNight === true, 'the midnight snapshot is night');
  const noFix = buildCoachSnapshot({ ...steady, position: null });
  expect(noFix.isNight === false, 'without a position the snapshot does not call it night');

  const staleWind = buildCoachSnapshot({
    ...steady,
    dataHealth: steady.dataHealth.map(row => row.input === 'tws' ? { ...row, status: 'stale' as const } : row),
  });
  expect(staleWind.wind.tws.mean == null && staleWind.wind.tws.n === 0, 'stale true wind is dropped');
  expect(staleWind.wind.gustSpreadKn == null && staleWind.wind.twsTrendKnPerHour == null, 'a stale wind has no gust or trend');
  expect(staleWind.pointOfSail === 'upwind', 'angle still names the point of sail when speed is stale');
  expect(staleWind.performance.targetKn == null, 'a target needs both wind speed and angle');

  const built = 10_000_000;
  const breezeTimes = [built - 60 * 60_000, built - 30 * 60_000, built];
  const breezeValues = [16, 20, 24];
  const breeze = buildCoachSnapshot({
    builtAt: built,
    windowMin: 60,
    vessel: vessel(),
    position,
    samples: breezeTimes.map((at, index) => ({ at, twsKn: breezeValues[index], twaDeg: 60 })),
    dataHealth: health(['tws', 'twa']),
    targetKn: 9,
    sails: { up: 'full main' },
  });
  expect(breeze.wind.tws.mean === 20, `building mean, got ${breeze.wind.tws.mean}`);
  const slope = slopePerMinute(breezeTimes, breezeValues);
  expect(breeze.wind.tws.slopePerMin === slope, `building slope, got ${breeze.wind.tws.slopePerMin}`);
  expect(breeze.wind.twsTrendKnPerHour === (slope == null ? null : slope * 60), 'the hour trend is the per-minute slope times 60');
  expect(close(breeze.wind.twsTrendKnPerHour, 8), `16 to 24 kn in an hour is +8 kn/h, got ${breeze.wind.twsTrendKnPerHour}`);
  expect(breeze.pointOfSail === 'upwind', 'the building breeze is still upwind');
  expect(breeze.performance.stw.mean == null && breeze.helm.weatherHelmDeg == null, 'missing speed and rudder stay null');
  expect(breeze.performance.polarPct[15] == null, 'polar % needs a speed source');
  expect(breeze.performance.targetKn === 9, 'the polar target is kept when the wind is fresh');
  expect(breeze.performance.vmcKn == null, 'VMC needs a destination');
  expect(breeze.sails.up === '', 'sails up are blank when that input is missing');

  const sea = wave({ tpTrue: 6, hs: 1.8, confidence: 'medium', ambiguous: false, time: built });
  const runSamples: CoachStreamSample[] = [10, 12, 11].map((stwKn, index) => ({
    at: built - (2 - index) * 60_000,
    twsKn: 18,
    twaDeg: 120,
    stwKn,
  }));
  const run = buildCoachSnapshot({
    builtAt: built,
    windowMin: 30,
    vessel: vessel(),
    samples: runSamples,
    dataHealth: health(['tws', 'twa', 'stw']),
    targetKn: 10,
    wave: sea,
  });
  expect(run.pointOfSail === 'downwind', `120° is downwind, got ${run.pointOfSail}`);
  const runVmg = [10, 12, 11].reduce((sum, speed) => sum + windVmgKnots(speed, 120, true), 0) / 3;
  expect(run.performance.vmgKn === runVmg, `downwind VMG, got ${run.performance.vmgKn}`);
  expect(run.downwind.maxStwKn === 12 && close(run.downwind.maxOverTargetPct, 20), `peak above target, got ${run.downwind.maxOverTargetPct}`);
  expect(run.waves.estimate === sea, 'the wave estimate is copied unchanged');
  expect(run.waves.usable === true && run.waves.ageMin === 0, 'a fresh medium-confidence estimate is usable');
  const wavelength = COACH_WAVE_LENGTH_M_PER_S2 * 6 * 6;
  expect(run.waves.wavelengthM === wavelength, `Tp 6 s wavelength, got ${run.waves.wavelengthM}`);
  expect(run.waves.phaseSpeedKn === COACH_WAVE_PHASE_SPEED_KN_PER_S * 6, `Tp 6 s phase speed, got ${run.waves.phaseSpeedKn}`);
  expect(run.waves.lengthRatio === wavelength / 14, `length ratio, got ${run.waves.lengthRatio}`);
  expect(run.waves.steepness === 1.8 / wavelength, `steepness, got ${run.waves.steepness}`);

  const noWaterline = buildCoachSnapshot({
    builtAt: built,
    windowMin: 30,
    vessel: { ...vessel(), lWlM: null },
    samples: runSamples,
    dataHealth: health(['tws', 'twa', 'stw']),
    wave: sea,
  });
  expect(noWaterline.waves.wavelengthM === wavelength && noWaterline.waves.lengthRatio == null, 'no waterline leaves the length ratio null');

  const blind = buildCoachSnapshot({
    ...steady,
    dataHealth: steady.dataHealth.map(row => row.input === 'rudder' ? { ...row, status: 'missing' as const } : row),
  });
  expect(blind.helm.weatherHelmDeg == null && blind.helm.rudderSdDeg == null, 'a missing rudder removes helm numbers');
  expect(blind.wind.tws.mean === 14 && blind.helm.headingSdDeg === 0, 'the rest of a steady beat remains');

  const ambiguous = wave({ tpTrue: 6, hs: 1.8, confidence: 'medium', ambiguous: true, time: built });
  const unresolved = buildCoachSnapshot({
    builtAt: built,
    windowMin: 30,
    vessel: vessel(),
    samples: [],
    dataHealth: [],
    wave: ambiguous,
  });
  expect(unresolved.waves.usable === false, 'an ambiguous direction is not usable');
  expect(unresolved.waves.wavelengthM === wavelength, 'period still gives a wavelength when direction is ambiguous');
  expect(unresolved.waves.estimate === ambiguous, 'the ambiguous estimate is kept as produced');

  const low = buildCoachSnapshot({
    builtAt: built,
    windowMin: 30,
    vessel: vessel(),
    samples: [],
    dataHealth: [],
    wave: wave({ tpTrue: 6, hs: 1.8, confidence: 'low', ambiguous: false, time: built }),
  });
  expect(low.waves.usable === false && low.waves.wavelengthM === wavelength, 'low confidence is not usable, and the period is still recorded');

  const noPeriod = buildCoachSnapshot({
    builtAt: built,
    windowMin: 30,
    vessel: vessel(),
    samples: [],
    dataHealth: [],
    wave: wave({ tpTrue: null, hs: 1.8, confidence: 'high', ambiguous: false, time: built }),
  });
  expect(
    noPeriod.waves.wavelengthM == null && noPeriod.waves.phaseSpeedKn == null && noPeriod.waves.steepness == null,
    'without a true period the derived wave numbers stay null',
  );

  expect(point(70) === 'reach' && point(110) === 'reach' && point(111) === 'downwind' && point(69) === 'upwind', 'point of sail uses the 70° and 110° boundaries');

  return failures;
}

function point(twaDeg: number): CoachSnapshot['pointOfSail'] {
  return buildCoachSnapshot({
    builtAt: 1_000,
    windowMin: 10,
    vessel: vessel(),
    samples: [{ at: 1_000, twaDeg }],
    dataHealth: health(['twa']),
  }).pointOfSail;
}

function steadyInput(builtAt: number): CoachSnapshotInput {
  const beat: CoachStreamSample[] = [120_000, 60_000, 0].map(age => ({
    at: builtAt - age,
    twsKn: 14,
    twaDeg: 60,
    signedTwaDeg: 60,
    twdDeg: 220,
    awsKn: 18,
    stwKn: 8,
    sogKn: 8,
    headingDeg: 0,
    cogDeg: 0,
    rudderPrimaryRad: -3 * Math.PI / 180,
    autopilotEngaged: true,
    autopilotMode: 'auto',
  }));
  const pitch: CoachStreamSample[] = Array.from({ length: 16 }, (_, index) => ({
    at: builtAt - index * 1_000,
    pitchRad: 0,
  }));
  return {
    builtAt,
    windowMin: 15,
    vessel: vessel(),
    position: { lat: 50, lon: 0 },
    destination: { lat: 51, lon: 0 },
    samples: [...beat, ...pitch],
    dataHealth: health(['tws', 'twa', 'twd', 'aws', 'stw', 'sog', 'heading', 'cog', 'rudder', 'attitude', 'autopilot', 'pressure', 'sails']),
    polarPct: { 15: 90, 30: 91, 60: 92 },
    targetKn: 8,
    gust10mKn: 16,
    sails: { up: 'full main + jib', upChangedAt: builtAt - 60_000 },
    outlook: { pressureHpa: 1013, pressureTrend3hHpa: -1 },
  };
}

function vessel(): CoachSnapshot['vessel'] {
  return {
    slug: 'cattitude',
    hullType: 'cat',
    hasDaggerboards: false,
    lWlM: 14,
    polarFile: 'outremer-55sc.pol',
  };
}

function health(ok: string[]): CoachSnapshot['dataHealth'] {
  return ok.map(input => ({ input, status: 'ok' as const }));
}

function wave(partial: Pick<WaveEstimate, 'tpTrue' | 'hs' | 'confidence' | 'ambiguous' | 'time'>): WaveEstimate {
  return { ...emptyEstimate(''), status: 'ok', reason: '', flags: [], ...partial };
}

function expectStat(
  failures: string[],
  label: string,
  stat: Stat | null,
  mean: number,
  sd: number,
  slope: number,
  n: number,
): void {
  if (!stat) {
    failures.push(`${label} is null`);
    return;
  }
  if (stat.mean !== mean || stat.sd !== sd || stat.slopePerMin !== slope || stat.n !== n) {
    failures.push(`${label} expected ${mean} / sd ${sd} / slope ${slope} / n ${n}, got ${stat.mean} / ${stat.sd} / ${stat.slopePerMin} / ${stat.n}`);
  }
}

function close(value: number | null, expected: number): boolean {
  return value != null && Math.abs(value - expected) < 1e-9;
}
