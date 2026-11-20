import { attitudeParts, attitudeSourceId, fasterAttitude } from './wave-attitude';
import { G, ResolvedWaveConfig, WaveBoatSettings, defaultWaveSettings, normalizeWaveSettings, resolveWaveConfig } from './wave-settings';
import {
  WaveEstimate,
  analyzeWindow,
  disambiguateCourseChange,
  naturalPeriodFromDecay,
  syntheticSea,
  trueFrequency,
} from './wave-estimator';

export function waveEstimatorFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const packed = attitudeParts({ yaw: null, pitch: -0.0116, roll: -0.0162 });
  expect(packed?.pitch === -0.0116 && packed.roll === -0.0162, 'navigation.attitude carries pitch and roll together');
  expect(attitudeSourceId({ $source: 'imu.fast', source: { label: 'slow' } }) === 'imu.fast', 'the named Signal K source identifies the device');
  const slow = { pitch: { t: [0, 1, 2], v: [0, 0, 0] }, roll: { t: [0, 1, 2], v: [0, 0, 0] } };
  const fast = { pitch: { t: [0, 0.1, 0.2, 0.3], v: [0, 0, 0, 0] }, roll: { t: [0, 0.1, 0.2, 0.3], v: [0, 0, 0, 0] } };
  expect(fasterAttitude([slow, fast]) === fast, 'the faster attitude source is the one that is used');

  const catDefault = resolveWaveConfig(defaultWaveSettings(), 'sailing_catamaran');
  expect(catDefault.antennaY === 3 && catDefault.antennaZ === 1.5, `cat antenna defaults, got ${catDefault.antennaY} m starboard and ${catDefault.antennaZ} m high`);
  const monoDefault = resolveWaveConfig(defaultWaveSettings(), 'sailing_monohull');
  expect(monoDefault.antennaY === 0 && monoDefault.antennaZ === 0, 'mono antenna defaults stay on the centreline at the waterline');
  const migrated = resolveWaveConfig(normalizeWaveSettings({ hullType: 'cat', antennaY: 0, antennaZ: 0 }), 'sailing_catamaran');
  expect(migrated.antennaY === 3 && migrated.antennaZ === 1.5, 'an unset stored cat antenna picks up the preset');

  const mono = boat('mono', 12, 3.8, 5, 3.5, 3, 0.4);
  const cat = boat('cat', 16, 6.5, 2, 3, 2, 1);
  expect(mono.fs === 4 && mono.minNativeRateHz > 1.3 && mono.minNativeRateHz < 1.6, `mono sample rate resolves near 1.4 Hz, got ${mono.minNativeRateHz}`);
  expect(cat.minNativeRateHz === 2, `cat sample rate resolves at 2 Hz, got ${cat.minNativeRateHz}`);

  const omega = (2 * Math.PI) / 7;
  const speed = 6 * 0.514444;
  const head = Math.PI;
  const k = (omega * omega) / G;
  const encounter = omega - k * speed * Math.cos(head);
  const roots = trueFrequency(encounter, speed, head, mono.trueTLimits);
  expect(roots.length === 1 && close(roots[0], omega, 0.02), `head-sea true frequency, got ${roots.join(',')}`);

  checkSea(failures, 'head seas', mono, {
    hs: 1.5, tp: 7, dirFromTrueDeg: 45, headingTrueDeg: 45, speedKn: 6, seed: 3,
  }, (estimate) => {
    expectClose(failures, 'head Hs', estimate.hs, 1.5, 0.25);
    expectClose(failures, 'head period', estimate.tpTrue, 7, 0.1);
    expectAngle(failures, 'head direction', estimate.dirFromTrue, 45, 20);
    expect(estimate.ambiguous === false, 'head seas should be unambiguous with heave');
  });

  checkSea(failures, 'starboard beam', mono, {
    hs: 1.2, tp: 8, dirFromTrueDeg: 90, headingTrueDeg: 0, speedKn: 5, seed: 5,
  }, (estimate) => {
    expectAngle(failures, 'starboard direction', estimate.dirFromTrue, 90, 20);
    expectClose(failures, 'starboard period', estimate.tpTrue, 8, 0.1);
  });

  checkSea(failures, 'port beam', mono, {
    hs: 1.2, tp: 8, dirFromTrueDeg: 270, headingTrueDeg: 0, speedKn: 5, seed: 6,
  }, (estimate) => {
    expectAngle(failures, 'port direction', estimate.dirFromTrue, 270, 20);
  });

  checkSea(failures, 'following seas', mono, {
    hs: 1.4, tp: 8, dirFromTrueDeg: 180, headingTrueDeg: 0, speedKn: 6, seed: 8,
  }, (estimate) => {
    expect(estimate.flags.some((flag) => flag.toLowerCase().includes('doppler')), `following seas should flag Doppler, flags: ${estimate.flags.join('; ')}`);
    expectAngle(failures, 'following direction', estimate.dirFromTrue, 180, 20);
  });

  checkSea(failures, 'short chop', mono, {
    hs: 1.2, tp: 3, dirFromTrueDeg: 0, headingTrueDeg: 0, speedKn: 4, seed: 9,
  }, (estimate) => {
    expect(estimate.flags.some((flag) => flag.includes('short waves')), `short waves should be flagged, flags: ${estimate.flags.join('; ')}`);
    expect(estimate.hsSlope != null && estimate.hsSlope < 1.2 * 0.8, `slope height should be low, got ${estimate.hsSlope}`);
  });

  checkSea(failures, 'roll resonance', mono, {
    hs: 1.3, tp: 5, dirFromTrueDeg: 230, headingTrueDeg: 0, speedKn: 2, seed: 11,
  }, (estimate) => {
    expect(estimate.flags.some((flag) => flag.includes('natural roll')), `roll resonance should be flagged, flags: ${estimate.flags.join('; ')}`);
    expectAngle(failures, 'roll-resonance direction', estimate.dirFromTrue, 230, 20);
    expectClose(failures, 'roll-resonance period', estimate.tpTrue, 5, 0.15);
  });

  checkSea(failures, 'gusty heel', mono, {
    hs: 1.2, tp: 8, dirFromTrueDeg: 10, headingTrueDeg: 10, speedKn: 5, seed: 13,
    heel: { periodS: 60, meanDeg: 25, ampDeg: 15 },
  }, (estimate) => {
    expectClose(failures, 'heel period', estimate.tpTrue, 8, 0.15);
    expect(estimate.tpTrue != null && estimate.tpTrue < 20, `heel should not look like a long swell, got ${estimate.tpTrue}`);
    expectClose(failures, 'heel height', estimate.hs, 1.2, 0.35);
  });

  checkSea(failures, 'heave off, course change', mono, {
    hs: 1.5, tp: 8, dirFromTrueDeg: 0, headingTrueDeg: 0, speedKn: 6, seed: 15, heave: false,
  }, (first) => {
    const second = run(mono, {
      hs: 1.5, tp: 8, dirFromTrueDeg: 0, headingTrueDeg: 80, speedKn: 6, seed: 16, heave: false,
    });
    const from = disambiguateCourseChange(first, second, mono);
    expect(from != null && angleGap(from, 0) <= 20, `course change should resolve direction, got ${from}; first ${first.dirCandidates.join('/')} second ${second.dirCandidates.join('/')}`);
  });

  checkSea(failures, 'slow mono samples', mono, {
    hs: 1.2, tp: 8, dirFromTrueDeg: 0, headingTrueDeg: 0, speedKn: 4, seed: 18, nativeHz: 1,
  }, (estimate) => {
    expect(estimate.flags.some((flag) => flag.includes('too slow')), `1 Hz should be flagged, flags: ${estimate.flags.join('; ')}`);
  });

  checkSea(failures, 'slow cat samples', cat, {
    hs: 1, tp: 7, dirFromTrueDeg: 20, headingTrueDeg: 20, speedKn: 5, seed: 19, nativeHz: 1,
  }, (estimate) => {
    expect(estimate.confidence === 'low', `cat at 1 Hz should cap confidence, got ${estimate.confidence}; ${estimate.flags.join('; ')}`);
    expect(estimate.flags.some((flag) => flag.includes('too slow')), 'cat at 1 Hz should mention aliasing');
  });

  checkSea(failures, 'cat chop', cat, {
    hs: 0.8, tp: 2.2, dirFromTrueDeg: 90, headingTrueDeg: 0, speedKn: 4, seed: 21, durationS: 700,
  }, (estimate) => {
    expect((estimate.chopIndex ?? 0) > 0.4, `chop index should be high, got ${estimate.chopIndex}`);
    expect(estimate.flags.some((flag) => flag.includes('chop')), `chop should be flagged, flags: ${estimate.flags.join('; ')}`);
    expect(estimate.tpTrue == null || estimate.tpTrue > 4, `band result should not report the 2.2 s chop, got ${estimate.tpTrue}`);
    expect(estimate.confidence === 'low', `chop should keep confidence low, got ${estimate.confidence}`);
  });

  checkSea(failures, 'cat pitch resonance', cat, {
    hs: 1.2, tp: 3, dirFromTrueDeg: 20, headingTrueDeg: 0, speedKn: 1, seed: 23,
  }, (estimate) => {
    expect(estimate.flags.some((flag) => flag.includes('natural pitch')), `pitch resonance should be flagged, flags: ${estimate.flags.join('; ')}`);
    expectClose(failures, 'pitch-resonance period', estimate.tpTrue, 3, 0.15);
  });

  const decay = dampedRoll(5, 0.08, 10);
  const measured = naturalPeriodFromDecay(decay, 10, 0);
  expect(measured.period != null && close(measured.period, 5, 0.08), `free-decay period, got ${measured.period} (${measured.note})`);

  return failures;
}

function checkSea(
  failures: string[],
  label: string,
  config: ResolvedWaveConfig,
  options: Parameters<typeof run>[1],
  assert: (estimate: WaveEstimate) => void,
): void {
  const estimate = run(config, options);
  if (estimate.status !== 'ok') {
    failures.push(`${label} skipped: ${estimate.reason}; ${estimate.flags.join('; ')}`);
    return;
  }
  assert(estimate);
}

function run(config: ResolvedWaveConfig, options: {
  hs: number;
  tp: number;
  dirFromTrueDeg: number;
  headingTrueDeg: number;
  speedKn: number;
  seed: number;
  heave?: boolean;
  nativeHz?: number;
  heel?: { periodS: number; meanDeg: number; ampDeg: number };
  durationS?: number;
}): WaveEstimate {
  const series = syntheticSea({
    ...options,
    durationS: options.durationS ?? config.windowS,
    config,
    noise: 0.01,
    spread: false,
  });
  return analyzeWindow(series, config);
}

function boat(
  hullType: 'mono' | 'cat',
  lWl: number,
  bRoll: number,
  tRoll: number,
  tPitch: number,
  antennaX: number,
  antennaY: number,
): ResolvedWaveConfig {
  const settings: WaveBoatSettings = {
    ...defaultWaveSettings(),
    hullType,
    lWl,
    bRoll,
    tRollNatural: tRoll,
    tPitchNatural: tPitch,
    antennaX,
    antennaY,
    antennaZ: 4,
    rollGain: 1,
  };
  return resolveWaveConfig(settings);
}

function expectClose(failures: string[], label: string, actual: number | null, expected: number, tol: number): void {
  if (actual == null || Math.abs(actual - expected) / expected > tol) {
    failures.push(`${label}: got ${actual}, expected ${expected} ±${tol * 100}%`);
  }
}

function expectAngle(failures: string[], label: string, actual: number | null, expected: number, tol: number): void {
  if (actual == null || angleGap(actual, expected) > tol) {
    failures.push(`${label}: got ${actual}, expected ${expected}° ±${tol}`);
  }
}

function angleGap(a: number, b: number): number {
  return Math.abs((((a - b) % 360) + 540) % 360 - 180);
}

function close(actual: number, expected: number, tol: number): boolean {
  return Math.abs(actual - expected) / expected <= tol;
}

function dampedRoll(period: number, zeta: number, fs: number): number[] {
  const wn = (2 * Math.PI) / period;
  const wd = wn * Math.sqrt(1 - zeta * zeta);
  const out: number[] = [];
  for (let i = 0; i < 30 * fs; i++) {
    const t = i / fs;
    out.push(Math.exp(-zeta * wn * t) * Math.cos(wd * t));
  }
  return out;
}
