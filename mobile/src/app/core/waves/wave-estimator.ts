/**
 * Significant wave height, period, and direction from pitch, roll, and GPS height.
 * A pitch-roll-heave buoy method, adapted to a moving boat.
 *
 * Sign checks live in the synthetic sea. If a wave from 045° comes out as 225°
 * or 315°, flip QUAD_SIGN or the roll sign in slopesFromAttitude, and nowhere else.
 */

import {
  G,
  KN_TO_MPS,
  ResolvedWaveConfig,
} from './wave-settings';

export interface WaveTrace {
  t: number[];
  v: number[];
}

export interface WaveSeries {
  pitch: WaveTrace;
  roll: WaveTrace;
  antennaAltitude?: WaveTrace;
  rateOfTurn?: WaveTrace;
  rudderAngle?: WaveTrace;
  stw?: WaveTrace;
  heading?: WaveTrace;
  windFrom?: WaveTrace;
}

export type WaveConfidence = 'high' | 'medium' | 'low' | 'none';

export interface WaveEstimate {
  status: 'ok' | 'skipped';
  reason: string;
  time: number;
  hs: number | null;
  hsHeave: number | null;
  hsSlope: number | null;
  tpTrue: number | null;
  tpEncounter: number | null;
  tmEncounter: number | null;
  /** Direction the waves come from, degrees true. */
  dirFromTrue: number | null;
  /** Direction the waves travel, degrees clockwise from the bow. 0 is toward the bow. */
  dirTravelBow: number | null;
  ambiguous: boolean;
  dirCandidates: number[];
  confidence: WaveConfidence;
  flags: string[];
  nativeRatesHz: Record<string, number>;
  chopIndex: number | null;
  headingRad: number | null;
  stw: number | null;
  /** Travel directions in the boat frame, radians. Two values when the axis is unresolved. */
  travelCandidatesRad: number[];
}

export interface CoursePrior {
  headingRad: number;
  stw: number;
  tpEncounter: number;
  time: number;
}

/** +1 matches the synthetic sea. -1 flips both heave/slope quad-spectra together. */
const QUAD_SIGN = 1;

export function emptyEstimate(reason: string): WaveEstimate {
  return {
    status: 'skipped',
    reason,
    time: Date.now(),
    hs: null,
    hsHeave: null,
    hsSlope: null,
    tpTrue: null,
    tpEncounter: null,
    tmEncounter: null,
    dirFromTrue: null,
    dirTravelBow: null,
    ambiguous: false,
    dirCandidates: [],
    confidence: 'none',
    flags: reason ? [reason] : [],
    nativeRatesHz: {},
    chopIndex: null,
    headingRad: null,
    stw: null,
    travelCandidatesRad: [],
  };
}

export function analyzeWindow(
  series: WaveSeries,
  config: ResolvedWaveConfig,
  prior?: CoursePrior | null,
): WaveEstimate {
  const flags: string[] = [];
  const native = nativeRates(series);
  const rateCap = noteRates(native, config, flags);

  const pitched = series.pitch?.t.length ?? 0;
  const rolled = series.roll?.t.length ?? 0;
  if (pitched < 8 || rolled < 8) return emptyEstimate('no pitch or roll yet');

  const tStart = Math.max(series.pitch.t[0], series.roll.t[0]);
  const tEnd = Math.min(series.pitch.t[pitched - 1], series.roll.t[rolled - 1]);
  const duration = tEnd - tStart;
  if (duration < 60) return emptyEstimate('not enough motion yet');

  const grid = timeGrid(tStart, tEnd, config.fs);
  const pitch = interp(series.pitch, grid, false);
  const roll = interp(series.roll, grid, false);
  const heading = series.heading ? interp(series.heading, grid, true) : filled(grid.length, NaN);
  const stw = series.stw ? interp(series.stw, grid, false) : filled(grid.length, NaN);
  const altitude = series.antennaAltitude ? interp(series.antennaAltitude, grid, false) : null;
  const rudder = series.rudderAngle ? interp(series.rudderAngle, grid, false) : null;
  const wind = series.windFrom ? interp(series.windFrom, grid, true) : null;

  const steady = windowIsSteady(heading, stw, pitch, roll, config);
  if (!steady.ok) {
    const skipped = emptyEstimate(steady.reason);
    skipped.nativeRatesHz = native;
    skipped.flags = [steady.reason, ...flags];
    return skipped;
  }

  if (duration + 1 < config.windowS) {
    flags.push(`window is ${Math.round(duration / 60)} of ${Math.round(config.windowS / 60)} min`);
  }

  const prepared = preprocess(pitch, roll, altitude, config, native, flags);
  const spec = spectra(prepared.sx, prepared.sy, prepared.heave, prepared.rollRaw, config);
  const encounter = encounterPeriod(spec, config, flags);
  const heaveValid = prepared.heave != null && coherenceOk(spec, encounter.fPeak, config);

  let travelRad: number;
  let ambiguous = false;
  let travelCandidates: number[];
  if (heaveValid && spec.imZx && spec.imZy && spec.reZx && spec.reZy) {
    travelRad = directionWithHeave(spec, config);
    travelCandidates = [travelRad];
  } else {
    const axis = directionAxis(spec, config);
    travelCandidates = axis;
    const windFrom = wind ? circularMean(wind) : null;
    const resolved = resolveAmbiguity(axis, circularMean(heading), meanFinite(stw), encounter.tpEnc, config, prior ?? null, windFrom);
    travelRad = resolved.travelRad;
    ambiguous = resolved.ambiguous;
    if (resolved.note) flags.push(resolved.note);
  }

  const speed = meanFinite(stw);
  const headingRad = circularMean(heading);
  const roots = encounter.tpEnc > 0
    ? trueFrequency(2 * Math.PI / encounter.tpEnc, speed, travelRad, config.trueTLimits)
    : [];
  if (roots.length > 1) flags.push('Doppler ambiguous');
  if (encounter.tpEnc > 0 && roots.length === 0) flags.push('no true-period solution');
  const omega = chooseRoot(roots, 2 * Math.PI / encounter.tpEnc);
  const tpTrue = omega == null ? null : (2 * Math.PI) / omega;

  const hsHeave = heaveValid && spec.szz ? 4 * Math.sqrt(Math.max(0, sumEnergy(spec.szz, spec.df))) : null;
  const hsSlope = omega == null ? null : hsFromSlopes(spec, speed, travelRad, omega, config, flags);
  let hs: number | null = null;
  if (hsHeave != null && hsSlope != null) {
    hs = 0.7 * hsHeave + 0.3 * hsSlope;
    if (hs > 0 && Math.abs(hsHeave - hsSlope) / hs > 0.5) flags.push('heave and slope heights disagree');
  } else if (hsHeave != null) {
    hs = hsHeave;
  } else {
    hs = hsSlope;
  }

  let confidence: WaveConfidence = 'high';
  if (!heaveValid) confidence = cap(confidence, 'medium');
  if (hsHeave == null) confidence = cap(confidence, 'medium');
  if (ambiguous) confidence = cap(confidence, 'low');
  if (encounter.peakiness < 2.2) confidence = cap(confidence, 'medium');
  if (encounter.peakiness < 1.5) confidence = cap(confidence, 'low');
  if (duration + 1 < config.windowS) confidence = cap(confidence, 'medium');
  if (roots.length !== 1) confidence = cap(confidence, 'medium');
  confidence = cap(confidence, rateCap);
  confidence = cap(confidence, encounter.confidenceCap);
  if (spec.chopOutsideBand) confidence = cap(confidence, 'low');

  if (rudder && stdFinite(rudder) > (15 * Math.PI) / 180) flags.push('active steering');

  const dirTravelBow = wrapDeg((travelRad * 180) / Math.PI);
  const dirFromTrue = wrapDeg((headingRad * 180) / Math.PI + dirTravelBow + 180);
  const candidates = travelCandidates.map((theta) => wrapDeg((headingRad * 180) / Math.PI + (theta * 180) / Math.PI + 180));

  return {
    status: 'ok',
    reason: '',
    time: Date.now(),
    hs,
    hsHeave,
    hsSlope,
    tpTrue,
    tpEncounter: encounter.tpEnc,
    tmEncounter: encounter.tmEnc,
    dirFromTrue: ambiguous ? null : dirFromTrue,
    dirTravelBow: ambiguous ? null : dirTravelBow,
    ambiguous,
    dirCandidates: ambiguous ? candidates : [dirFromTrue],
    confidence,
    flags: unique(flags),
    nativeRatesHz: native,
    chopIndex: spec.chopIndex,
    headingRad,
    stw: speed,
    travelCandidatesRad: travelCandidates,
  };
}

/**
 * Pick the travel direction whose true period agrees across two steady headings.
 * Returns degrees the waves come from, or null when the two headings do not separate them.
 */
export function disambiguateCourseChange(a: WaveEstimate, b: WaveEstimate, config: ResolvedWaveConfig): number | null {
  if (a.headingRad == null || b.headingRad == null || a.stw == null || b.stw == null) return null;
  if (a.tpEncounter == null || b.tpEncounter == null) return null;
  if (a.travelCandidatesRad.length < 1 || b.status !== 'ok') return null;
  const gap = Math.abs(wrapRad(a.headingRad - b.headingRad));
  if (gap < (20 * Math.PI) / 180) return null;
  let best: { from: number; score: number } | null = null;
  let second = Infinity;
  for (const theta of a.travelCandidatesRad) {
    const travelTrue = a.headingRad + theta;
    const thetaB = wrapRad(travelTrue - b.headingRad);
    const ta = periodOf(trueFrequency(2 * Math.PI / a.tpEncounter, a.stw, theta, config.trueTLimits), a.tpEncounter);
    const tb = periodOf(trueFrequency(2 * Math.PI / b.tpEncounter, b.stw, thetaB, config.trueTLimits), b.tpEncounter);
    const score = ta == null || tb == null ? 1e6 : Math.abs(ta - tb);
    const from = wrapDeg((travelTrue * 180) / Math.PI + 180);
    if (!best || score < best.score) {
      second = best ? best.score : second;
      best = { from, score };
    } else if (score < second) {
      second = score;
    }
  }
  if (!best || best.score > 2.5) return null;
  if (second < best.score + 1.5) return null;
  return best.from;
}

export function trueFrequency(
  omegaE: number,
  speed: number,
  travelRad: number,
  limits: [number, number],
): number[] {
  const a = (speed * Math.cos(travelRad)) / G;
  if (!Number.isFinite(omegaE) || omegaE <= 0) return [];
  if (Math.abs(a * omegaE) < 1e-3) return [omegaE];
  const roots: number[] = [];
  for (const sign of [1, -1]) {
    const we = sign * omegaE;
    const disc = 1 - 4 * a * we;
    if (disc < 0) continue;
    const root = Math.sqrt(disc);
    for (const r of [(1 - root) / (2 * a), (1 + root) / (2 * a)]) {
      if (r <= 0) continue;
      const period = (2 * Math.PI) / r;
      if (period >= limits[0] && period <= limits[1]) roots.push(r);
    }
  }
  return uniqueNumbers(roots);
}

export function naturalPeriodFromDecay(
  signal: number[],
  fs: number,
  tEvent = 0,
): { period: number | null; zeta: number | null; note: string } {
  const i0 = Math.max(0, Math.round(tEvent * fs));
  const slice = signal.slice(i0, i0 + Math.round(30 * fs));
  if (slice.length < Math.round(2 * fs)) return { period: null, zeta: null, note: 'too short' };
  const detrended = detrendLinear(Float64Array.from(slice));
  const filtered = bandpass(detrended, fs, 0.1, 1.5);
  let peak = 0;
  let peakAt = 0;
  for (let i = 1; i < filtered.length - 1; i++) {
    const a = Math.abs(filtered[i]);
    if (a > peak) {
      peak = a;
      peakAt = i;
    }
  }
  const maxima: number[] = [];
  const minima: number[] = [];
  const minGap = Math.max(2, Math.round(0.3 * fs));
  let last = -minGap;
  for (let i = peakAt + 1; i < filtered.length - 1; i++) {
    if (i - last < minGap) continue;
    if (filtered[i] > filtered[i - 1] && filtered[i] >= filtered[i + 1] && filtered[i] > 0) {
      maxima.push(i / fs);
      last = i;
    } else if (filtered[i] < filtered[i - 1] && filtered[i] <= filtered[i + 1] && filtered[i] < 0) {
      minima.push(i / fs);
      last = i;
    }
  }
  const gaps = diffs(maxima).concat(diffs(minima));
  if (gaps.length < 1 || maxima.length + minima.length < 2) {
    return { period: null, zeta: null, note: 'too heavily damped or too short; try a bigger wake' };
  }
  const period = median(gaps);
  const amps = peakAmps(filtered, fs, peakAt);
  let zeta: number | null = null;
  if (amps.length >= 2) {
    const logs: number[] = [];
    for (let i = 0; i < amps.length - 1; i++) {
      if (amps[i] > 0 && amps[i + 1] > 0) logs.push(Math.log(amps[i] / amps[i + 1]));
    }
    if (logs.length) {
      const delta = mean(logs);
      zeta = delta / Math.sqrt(4 * Math.PI * Math.PI + delta * delta);
    }
  }
  return { period, zeta, note: '' };
}

export interface SyntheticOptions {
  hs: number;
  tp: number;
  dirFromTrueDeg: number;
  headingTrueDeg: number;
  speedKn: number;
  durationS: number;
  config: ResolvedWaveConfig;
  noise?: number;
  heave?: boolean;
  nativeHz?: number;
  seed?: number;
  heel?: { periodS: number; meanDeg: number; ampDeg: number };
  spread?: boolean;
}

/** A narrow JONSWAP-like sea the estimator can be checked against. */
export function syntheticSea(opts: SyntheticOptions): WaveSeries {
  const fs = opts.config.fs;
  const n = Math.max(16, Math.round(opts.durationS * fs));
  const dt = 1 / fs;
  const theta = wrapRad((opts.dirFromTrueDeg + 180 - opts.headingTrueDeg) * Math.PI / 180);
  const speed = opts.speedKn * KN_TO_MPS;
  const ratios = opts.spread === false ? [1] : [0.9, 1, 1.12];
  const weights = ratios.map((ratio) => (ratio === 1 ? 1 : 0.35));
  const power = weights.reduce((sum, w) => sum + w * w, 0);
  const scale = (opts.hs / 4) * Math.sqrt(2 / power);
  const rng = mulberry32(opts.seed ?? 1);
  const phases = weights.map(() => rng() * 2 * Math.PI);
  const zetaRoll = opts.config.hullType === 'cat' ? 0.25 : 0.08;
  const zetaPitch = 0.2;
  const lWl = opts.config.lWl ?? 0;
  const bRoll = opts.config.bRoll ?? 0;

  const pitch = new Float64Array(n);
  const roll = new Float64Array(n);
  const eta = new Float64Array(n);
  const t: number[] = [];

  for (let c = 0; c < ratios.length; c++) {
    const period = opts.tp * ratios[c];
    const omega = (2 * Math.PI) / period;
    const k = (omega * omega) / G;
    const omegaE = omega - k * speed * Math.cos(theta);
    const amp = weights[c] * scale;
    const rp = lWl > 0 ? Math.abs(sinc(k * lWl * Math.cos(theta) / 2)) : 1;
    const rr = bRoll > 0 ? Math.abs(sinc(k * bRoll * Math.sin(theta) / 2)) : 1;
    const freq = Math.abs(omegaE);
    const pitchH = resonator(freq, (2 * Math.PI) / opts.config.tPitchNatural, zetaPitch);
    const rollH = resonator(freq, (2 * Math.PI) / opts.config.tRollNatural, zetaRoll);
    const phi = phases[c];
    // Static slope is Amp * sin(base). The resonator scales that Amp and shifts the phase.
    const pitchAmp = -amp * k * Math.cos(theta) * rp;
    const rollAmp = amp * k * Math.sin(theta) * rr * opts.config.rollGain;
    for (let i = 0; i < n; i++) {
      const base = -omegaE * (i * dt) + phi;
      eta[i] += amp * Math.cos(base);
      pitch[i] += pitchAmp * pitchH.gain * Math.sin(base - pitchH.phase);
      roll[i] += rollAmp * rollH.gain * Math.sin(base - rollH.phase);
    }
  }

  const noise = opts.noise ?? 0.02;
  for (let i = 0; i < n; i++) {
    const time = i * dt;
    t.push(time);
    if (opts.heel) {
      const wave = opts.heel.meanDeg + opts.heel.ampDeg * Math.sin((2 * Math.PI * time) / opts.heel.periodS);
      roll[i] += (wave * Math.PI) / 180;
    }
    pitch[i] += gaussian(rng) * noise * 0.01;
    roll[i] += gaussian(rng) * noise * 0.01;
    pitch[i] = Math.round(pitch[i] * 10000) / 10000;
    roll[i] = Math.round(roll[i] * 10000) / 10000;
  }

  const alt = new Float64Array(n);
  for (let i = 0; i < n; i++) {
    alt[i] = eta[i] + opts.config.antennaX * pitch[i] - opts.config.antennaY * roll[i];
    alt[i] += gaussian(rng) * noise * 0.05;
    alt[i] = Math.round(alt[i] * 100) / 100;
  }

  const keep = decimateIndexes(n, fs, opts.nativeHz);
  const heading = opts.headingTrueDeg * Math.PI / 180;
  const stw = speed;
  const series: WaveSeries = {
    pitch: take(t, pitch, keep),
    roll: take(t, roll, keep),
    stw: takeConstant(t, stw, keep),
    heading: takeConstant(t, heading, keep),
    rateOfTurn: takeConstant(t, 0, keep),
    rudderAngle: takeConstant(t, 0, keep),
  };
  if (opts.heave !== false) series.antennaAltitude = take(t, alt, keep);
  return series;
}

export function seaStateLabel(travelBowDeg: number | null): string {
  if (travelBowDeg == null || !Number.isFinite(travelBowDeg)) return '';
  const fromBow = wrapDeg(travelBowDeg + 180);
  if (fromBow < 30 || fromBow >= 330) return 'Head seas';
  if (fromBow < 75) return 'Starboard bow';
  if (fromBow < 105) return 'Beam, starboard';
  if (fromBow < 150) return 'Starboard quarter';
  if (fromBow < 210) return 'Following seas';
  if (fromBow < 255) return 'Port quarter';
  if (fromBow < 285) return 'Beam, port';
  return 'Port bow';
}

export function formatMetres(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} m`;
}

export function formatSeconds(value: number | null): string {
  return value == null || !Number.isFinite(value) ? '—' : `${value.toFixed(1)} s`;
}

export function formatFrom(value: number | null): string {
  if (value == null || !Number.isFinite(value)) return '—';
  const rounded = Math.round(wrapDeg(value)) % 360;
  return `${String(rounded).padStart(3, '0')}°`;
}

function preprocess(
  pitchIn: Float64Array,
  rollIn: Float64Array,
  altitude: Float64Array | null,
  config: ResolvedWaveConfig,
  native: Record<string, number>,
  flags: string[],
): { sx: Float64Array; sy: Float64Array; heave: Float64Array | null; rollRaw: Float64Array } {
  let pitch = detrendLinear(pitchIn);
  let roll = detrendLinear(rollIn);
  if (config.hullType === 'mono') {
    roll = highpass(roll, config.fs, config.bandEncHz[0] * 0.7);
    if (meanAbsFinite(rollIn) > (25 * Math.PI) / 180) flags.push('heavy heel: small-angle slope model degraded');
  }
  const slopes = slopesFromAttitude(pitch, roll, config.rollGain);
  let heave: Float64Array | null = null;
  const altRate = native['antennaAltitude'];
  if (altitude && (altRate == null || altRate >= config.minNativeRateHz)) {
    let z = detrendLinear(altitude);
    z = applyLever(z, pitch, roll, config);
    heave = bandpass(z, config.fs, config.bandEncHz[0], config.bandEncHz[1]);
  }
  return {
    sx: bandpass(slopes.sx, config.fs, config.bandEncHz[0], config.bandEncHz[1]),
    sy: bandpass(slopes.sy, config.fs, config.bandEncHz[0], config.bandEncHz[1]),
    heave,
    rollRaw: detrendLinear(rollIn),
  };
}

/** Bow up is a positive slope ahead. Starboard-down is a positive slope to starboard, so roll flips. */
function slopesFromAttitude(pitch: Float64Array, roll: Float64Array, rollGain: number): { sx: Float64Array; sy: Float64Array } {
  const sx = pitch;
  const sy = new Float64Array(roll.length);
  const gain = rollGain > 0 ? rollGain : 1;
  for (let i = 0; i < roll.length; i++) sy[i] = -roll[i] / gain;
  return { sx, sy };
}

function applyLever(z: Float64Array, pitch: Float64Array, roll: Float64Array, config: ResolvedWaveConfig): Float64Array {
  const out = new Float64Array(z.length);
  for (let i = 0; i < z.length; i++) {
    out[i] = z[i] - config.antennaX * pitch[i] + config.antennaY * roll[i];
  }
  return out;
}

interface Spectrum {
  f: Float64Array;
  df: number;
  sxx: Float64Array;
  syy: Float64Array;
  szz: Float64Array | null;
  co: Float64Array;
  imZx: Float64Array | null;
  imZy: Float64Array | null;
  reZx: Float64Array | null;
  reZy: Float64Array | null;
  cohZx: Float64Array | null;
  cohZy: Float64Array | null;
  energy: Float64Array;
  wPitch: Float64Array;
  wRoll: Float64Array;
  chopIndex: number | null;
  chopOutsideBand: boolean;
}

function spectra(
  sx: Float64Array,
  sy: Float64Array,
  heave: Float64Array | null,
  rollRaw: Float64Array,
  config: ResolvedWaveConfig,
): Spectrum {
  const built = welchPair(sx, sy, config);
  const sxx = built.autoX;
  const syy = built.autoY;
  const co = built.co;
  let szz: Float64Array | null = null;
  let imZx: Float64Array | null = null;
  let imZy: Float64Array | null = null;
  let reZx: Float64Array | null = null;
  let reZy: Float64Array | null = null;
  let cohZx: Float64Array | null = null;
  let cohZy: Float64Array | null = null;
  if (heave) {
    const zx = welchPair(heave, sx, config);
    const zy = welchPair(heave, sy, config);
    szz = zx.autoX;
    imZx = zx.quad;
    imZy = zy.quad;
    reZx = zx.co;
    reZy = zy.co;
    cohZx = zx.coh;
    cohZy = zy.coh;
  }
  const wPitch = new Float64Array(built.f.length);
  const wRoll = new Float64Array(built.f.length);
  const fRoll = 1 / config.tRollNatural;
  const fPitch = 1 / config.tPitchNatural;
  for (let i = 0; i < built.f.length; i++) {
    wPitch[i] = resonanceWeight(built.f[i], fPitch);
    wRoll[i] = resonanceWeight(built.f[i], fRoll);
  }
  const band = maskRange(built.f, config.bandEncHz[0], config.bandEncHz[1]);
  const chop = chopIndex(rollRaw, config);
  return {
    f: pick(built.f, band),
    df: built.df,
    sxx: pick(sxx, band),
    syy: pick(syy, band),
    szz: szz ? pick(szz, band) : null,
    co: pick(co, band),
    imZx: imZx ? pick(imZx, band) : null,
    imZy: imZy ? pick(imZy, band) : null,
    reZx: reZx ? pick(reZx, band) : null,
    reZy: reZy ? pick(reZy, band) : null,
    cohZx: cohZx ? pick(cohZx, band) : null,
    cohZy: cohZy ? pick(cohZy, band) : null,
    energy: new Float64Array(0),
    wPitch: pick(wPitch, band),
    wRoll: pick(wRoll, band),
    chopIndex: chop.index,
    chopOutsideBand: chop.outside,
  };
}

function encounterPeriod(
  spec: Spectrum,
  config: ResolvedWaveConfig,
  flags: string[],
): { tpEnc: number; tmEnc: number; peakiness: number; fPeak: number; confidenceCap: WaveConfidence } {
  const slope = new Float64Array(spec.f.length);
  for (let i = 0; i < spec.f.length; i++) {
    slope[i] = spec.sxx[i] * spec.wPitch[i] + spec.syy[i] * spec.wRoll[i];
  }
  const useHeave = spec.szz != null && sumEnergy(spec.szz, spec.df) > sumEnergy(slope, spec.df) * 0.02;
  const s = useHeave && spec.szz ? spec.szz : slope;
  spec.energy = s;
  const smooth = smooth3(s);
  let peakAt = 0;
  for (let i = 1; i < smooth.length; i++) if (smooth[i] > smooth[peakAt]) peakAt = i;
  let tpEnc = spec.f[peakAt] > 0 ? 1 / spec.f[peakAt] : 0;
  const m0 = sumEnergy(s, spec.df);
  let m1 = 0;
  for (let i = 0; i < s.length; i++) m1 += spec.f[i] * s[i];
  m1 *= spec.df;
  const tmEnc = m1 > 0 ? m0 / m1 : tpEnc;
  const peakiness = mean(Array.from(s)) > 0 ? max(s) / mean(Array.from(s)) : 0;
  let confidenceCap: WaveConfidence = 'high';

  if (!useHeave && tpEnc > 0) {
    const rollRes = nearPeriod(tpEnc, config.tRollNatural, config.resonanceTol);
    const pitchRes = nearPeriod(tpEnc, config.tPitchNatural, config.resonanceTol);
    if (rollRes && !pitchRes) {
      flags.push('peak near natural roll period');
      tpEnc = periodAtPeak(spec.f, spec.sxx);
    } else if (pitchRes && !rollRes) {
      flags.push('peak near natural pitch period');
      tpEnc = periodAtPeak(spec.f, spec.syy);
    } else if (rollRes && pitchRes) {
      flags.push('peak near both natural periods: period unreliable');
      confidenceCap = 'low';
    }
  } else if (useHeave) {
    const slopePeak = periodAtPeak(spec.f, slope);
    if (nearPeriod(slopePeak, config.tRollNatural, config.resonanceTol) && !nearPeriod(slopePeak, config.tPitchNatural, config.resonanceTol)) {
      flags.push('peak near natural roll period');
    }
    if (nearPeriod(slopePeak, config.tPitchNatural, config.resonanceTol) && !nearPeriod(slopePeak, config.tRollNatural, config.resonanceTol)) {
      flags.push('peak near natural pitch period');
    }
  }

  let suppressPeriod = false;
  if (spec.chopOutsideBand) {
    flags.push('chop: roll energy sits outside the wave band');
    confidenceCap = 'low';
    if (spec.chopIndex != null && spec.chopIndex > 0.4) suppressPeriod = true;
  }
  const period = suppressPeriod ? 0 : tpEnc > 0 ? tpEnc : tmEnc;
  return {
    tpEnc: period,
    tmEnc: suppressPeriod ? 0 : tmEnc,
    peakiness,
    fPeak: period > 0 ? 1 / period : 0,
    confidenceCap,
  };
}

function directionWithHeave(spec: Spectrum, config: ResolvedWaveConfig): number {
  let qzx = 0;
  let qzy = 0;
  const zetaPitch = 0.2;
  const zetaRoll = config.hullType === 'cat' ? 0.25 : 0.08;
  const reZx = spec.reZx ?? spec.imZx;
  const reZy = spec.reZy ?? spec.imZy;
  if (!spec.imZx || !spec.imZy || !reZx || !reZy) return 0;
  for (let i = 0; i < spec.imZx.length; i++) {
    const w = spec.energy[i] ?? 0;
    qzx += projectSlope(reZx[i], spec.imZx[i], spec.f[i], 1 / config.tPitchNatural, zetaPitch) * w;
    qzy += projectSlope(reZy[i], spec.imZy[i], spec.f[i], 1 / config.tRollNatural, zetaRoll) * w;
  }
  return Math.atan2(QUAD_SIGN * qzy, QUAD_SIGN * qzx);
}

/** Put a resonant slope back into quadrature with heave, and undo the amplitude gain. */
function projectSlope(re: number, im: number, f: number, fNatural: number, zeta: number): number {
  const omega = 2 * Math.PI * f;
  const wn = 2 * Math.PI * fNatural;
  const resp = resonator(omega, wn, zeta);
  const gain = Math.max(0.3, resp.gain);
  return (re * Math.sin(resp.phase) + im * Math.cos(resp.phase)) / gain;
}

function directionAxis(spec: Spectrum, config: ResolvedWaveConfig): [number, number] {
  let cxx = 0;
  let cyy = 0;
  let cxy = 0;
  for (let i = 0; i < spec.f.length; i++) {
    const wp = spec.wPitch[i];
    const wr = spec.wRoll[i];
    cxx += spec.sxx[i] * wp;
    cyy += spec.syy[i] * wr;
    cxy += spec.co[i] * Math.sqrt(wp * wr);
  }
  void config;
  const axis = 0.5 * Math.atan2(2 * cxy, cxx - cyy);
  return [axis, wrapRad(axis + Math.PI)];
}

function resolveAmbiguity(
  candidates: number[],
  headingRad: number,
  speed: number,
  tpEnc: number,
  config: ResolvedWaveConfig,
  prior: CoursePrior | null,
  windFrom: number | null,
): { travelRad: number; ambiguous: boolean; note: string } {
  if (!(tpEnc > 0)) return { travelRad: candidates[0] ?? 0, ambiguous: true, note: '' };
  if (prior && Date.now() - prior.time < 2 * 60 * 60 * 1000) {
    const gap = Math.abs(wrapRad(headingRad - prior.headingRad));
    if (gap > (20 * Math.PI) / 180) {
      const scored = candidates.map((theta) => {
        const travelTrue = headingRad + theta;
        const thetaPrior = wrapRad(travelTrue - prior.headingRad);
        const ta = periodOf(trueFrequency(2 * Math.PI / tpEnc, speed, theta, config.trueTLimits), tpEnc);
        const tb = periodOf(trueFrequency(2 * Math.PI / prior.tpEncounter, prior.stw, thetaPrior, config.trueTLimits), prior.tpEncounter);
        return { theta, score: ta == null || tb == null ? 1e6 : Math.abs(ta - tb) };
      }).sort((a, b) => a.score - b.score);
      if (scored.length >= 2 && scored[0].score < 2.5 && scored[1].score > scored[0].score + 1.5) {
        return { travelRad: scored[0].theta, ambiguous: false, note: '' };
      }
    }
  }

  const feasible = candidates.filter((theta) => trueFrequency(2 * Math.PI / tpEnc, speed, theta, config.trueTLimits).length > 0);
  if (feasible.length === 1) return { travelRad: feasible[0], ambiguous: false, note: '' };

  if (windFrom != null && tpEnc > 0 && tpEnc < 8) {
    const downwind = wrapRad(windFrom + Math.PI);
    const ranked = candidates.map((theta) => ({
      theta,
      miss: Math.abs(wrapRad(headingRad + theta - downwind)),
    })).sort((a, b) => a.miss - b.miss);
    if (ranked[0] && ranked[0].miss < Math.PI / 3 && (!ranked[1] || ranked[1].miss > ranked[0].miss + Math.PI / 6)) {
      return { travelRad: ranked[0].theta, ambiguous: false, note: 'direction from the wind' };
    }
  }

  return { travelRad: candidates[0] ?? 0, ambiguous: true, note: 'ambiguous direction' };
}

function hsFromSlopes(
  spec: Spectrum,
  speed: number,
  travelRad: number,
  peakOmega: number,
  config: ResolvedWaveConfig,
  flags: string[],
): number | null {
  let m0 = 0;
  let short = false;
  let missingHull = false;
  const peak = max(spec.sxx) + max(spec.syy);
  for (let i = 0; i < spec.f.length; i++) {
    const weight = spec.sxx[i] + spec.syy[i];
    if (peak > 0 && weight < peak * 0.1) continue;
    const roots = trueFrequency(2 * Math.PI * spec.f[i], speed, travelRad, config.trueTLimits);
    const omega = chooseRoot(roots, peakOmega);
    if (omega == null) continue;
    const k = (omega * omega) / G;
    if (k < 1e-4) continue;
    const rp = response(k, config.lWl, Math.cos(travelRad), config.rMin, flags, () => { missingHull = true; });
    const rr = response(k, config.bRoll, Math.sin(travelRad), config.rMin, flags, () => { missingHull = true; });
    if (rp < 0.6 || rr < 0.6) short = true;
    const varSlope = (spec.wPitch[i] * spec.sxx[i] / (rp * rp) + spec.wRoll[i] * spec.syy[i] / (rr * rr)) * spec.df;
    m0 += varSlope / (k * k);
  }
  if (short) flags.push('short waves: height underestimated');
  if (missingHull) flags.push('hull length or beam not set');
  if (m0 <= 0) return null;
  return 4 * Math.sqrt(m0);
}

function response(
  k: number,
  length: number | null,
  trig: number,
  rMin: number,
  flags: string[],
  missing: () => void,
): number {
  void flags;
  if (length == null || length <= 0) {
    missing();
    return 1;
  }
  return Math.max(rMin, Math.abs(sinc((k * length * trig) / 2)));
}

function coherenceOk(spec: Spectrum, fPeak: number, config: ResolvedWaveConfig): boolean {
  if (!spec.cohZx || !spec.cohZy || spec.f.length === 0) return false;
  const width = Math.max(spec.df * 2, Math.abs(fPeak) * 0.15);
  let zx = 0;
  let zy = 0;
  let n = 0;
  for (let i = 0; i < spec.f.length; i++) {
    if (Math.abs(spec.f[i] - fPeak) > width) continue;
    zx += spec.cohZx[i];
    zy += spec.cohZy[i];
    n++;
  }
  if (n === 0) return false;
  return zx / n >= config.minCoherenceHeave || zy / n >= config.minCoherenceHeave;
}

function windowIsSteady(
  heading: Float64Array,
  stw: Float64Array,
  pitch: Float64Array,
  roll: Float64Array,
  config: ResolvedWaveConfig,
): { ok: boolean; reason: string } {
  const finiteHeading = finiteValues(heading);
  if (finiteHeading.length < 4) return { ok: false, reason: 'heading missing' };
  if (circularStdDeg(finiteHeading) > config.maxHeadingStdDeg) return { ok: false, reason: 'heading unsteady' };
  if (headingSpanDeg(finiteHeading) > config.maxHeadingJumpDeg) return { ok: false, reason: 'tack/gybe/course change' };
  const speed = finiteValues(stw);
  if (speed.length < 4) return { ok: false, reason: 'speed missing' };
  const meanSpeed = mean(speed);
  const deviation = std(speed);
  if (meanSpeed >= 0.5) {
    if (deviation / meanSpeed > config.maxStwCv) return { ok: false, reason: 'speed unsteady' };
  } else if (deviation > 0.15) {
    return { ok: false, reason: 'speed unsteady' };
  }
  if (fractionNan(pitch, roll) > 0.05) return { ok: false, reason: 'data gaps' };
  return { ok: true, reason: '' };
}

function noteRates(native: Record<string, number>, config: ResolvedWaveConfig, flags: string[]): WaveConfidence {
  let capTo: WaveConfidence = 'high';
  for (const path of ['pitch', 'roll', 'antennaAltitude']) {
    const rate = native[path];
    if (rate == null) continue;
    if (rate < config.minNativeRateHz) {
      flags.push(`${path} sampled at ${rate.toFixed(1)} Hz: too slow for this hull; aliasing risk`);
      if (config.hullType === 'cat' && (path === 'pitch' || path === 'roll')) capTo = 'low';
    }
  }
  return capTo;
}

function nativeRates(series: WaveSeries): Record<string, number> {
  const out: Record<string, number> = {};
  const read = (name: string, trace?: WaveTrace) => {
    const rate = rateOf(trace);
    if (rate != null) out[name] = rate;
  };
  read('pitch', series.pitch);
  read('roll', series.roll);
  read('antennaAltitude', series.antennaAltitude);
  read('stw', series.stw);
  read('heading', series.heading);
  return out;
}

function chopIndex(roll: Float64Array, config: ResolvedWaveConfig): { index: number | null; outside: boolean } {
  if (config.hullType !== 'cat') return { index: null, outside: false };
  const psd = welchAuto(roll, config);
  const fNat = 1 / config.tRollNatural;
  let all = 0;
  let near = 0;
  let inBand = 0;
  for (let i = 1; i < psd.f.length; i++) {
    const e = psd.p[i] * psd.df;
    all += e;
    if (Math.abs(psd.f[i] - fNat) / fNat <= config.resonanceTol) near += e;
    if (psd.f[i] >= config.bandEncHz[0] && psd.f[i] <= config.bandEncHz[1]) inBand += e;
  }
  if (all <= 0) return { index: 0, outside: false };
  const index = near / all;
  return { index, outside: index > 0.4 && inBand / all < 0.3 };
}

interface WelchPair {
  f: Float64Array;
  df: number;
  autoX: Float64Array;
  autoY: Float64Array;
  co: Float64Array;
  quad: Float64Array;
  coh: Float64Array;
}

function welchPair(x: Float64Array, y: Float64Array, config: ResolvedWaveConfig): WelchPair {
  const { starts, nperseg, nfft, window, scale } = welchPlan(x.length, config);
  const bins = nfft / 2 + 1;
  const autoX = new Float64Array(bins);
  const autoY = new Float64Array(bins);
  const co = new Float64Array(bins);
  const quad = new Float64Array(bins);
  let used = 0;
  const xr = new Float64Array(nfft);
  const xi = new Float64Array(nfft);
  const yr = new Float64Array(nfft);
  const yi = new Float64Array(nfft);
  for (const start of starts) {
    xr.fill(0);
    xi.fill(0);
    yr.fill(0);
    yi.fill(0);
    for (let i = 0; i < nperseg && start + i < x.length; i++) {
      xr[i] = x[start + i] * window[i];
      yr[i] = y[start + i] * window[i];
    }
    fft(xr, xi, false);
    fft(yr, yi, false);
    for (let k = 0; k < bins; k++) {
      autoX[k] += xr[k] * xr[k] + xi[k] * xi[k];
      autoY[k] += yr[k] * yr[k] + yi[k] * yi[k];
      co[k] += xr[k] * yr[k] + xi[k] * yi[k];
      quad[k] += xi[k] * yr[k] - xr[k] * yi[k];
    }
    used++;
  }
  const sided = used > 0 ? scale / used : 0;
  for (let k = 0; k < bins; k++) {
    const side = k > 0 && k < nfft / 2 ? 2 : 1;
    autoX[k] *= sided * side;
    autoY[k] *= sided * side;
    co[k] *= sided * side;
    quad[k] *= sided * side;
  }
  const coh = new Float64Array(bins);
  for (let k = 0; k < bins; k++) {
    const den = autoX[k] * autoY[k];
    coh[k] = den > 0 ? Math.min(1, (co[k] * co[k] + quad[k] * quad[k]) / den) : 0;
  }
  const f = new Float64Array(bins);
  const df = config.fs / nfft;
  for (let k = 0; k < bins; k++) f[k] = k * df;
  return { f, df, autoX, autoY, co, quad, coh };
}

function welchAuto(x: Float64Array, config: ResolvedWaveConfig): { f: Float64Array; p: Float64Array; df: number } {
  const pair = welchPair(x, x, config);
  return { f: pair.f, p: pair.autoX, df: pair.df };
}

function welchPlan(length: number, config: ResolvedWaveConfig): {
  starts: number[];
  nperseg: number;
  nfft: number;
  window: Float64Array;
  scale: number;
} {
  let nperseg = Math.round(config.welchSegS * config.fs);
  if (nperseg > length) nperseg = length;
  if (nperseg < 32) nperseg = Math.min(length, 32);
  const nfft = nextPow2(nperseg);
  const overlap = Math.floor(nperseg * config.welchOverlap);
  const step = Math.max(1, nperseg - overlap);
  const starts: number[] = [];
  if (length <= nperseg) starts.push(0);
  else for (let start = 0; start + nperseg <= length; start += step) starts.push(start);
  const window = hann(nperseg);
  let energy = 0;
  for (let i = 0; i < window.length; i++) energy += window[i] * window[i];
  const scale = energy > 0 ? 1 / (config.fs * energy) : 1;
  return { starts, nperseg, nfft, window, scale };
}

function resonator(omega: number, wn: number, zeta: number): { gain: number; phase: number } {
  if (omega <= 0) return { gain: 1, phase: 0 };
  const re = wn * wn - omega * omega;
  const im = 2 * zeta * wn * omega;
  return { gain: (wn * wn) / Math.hypot(re, im), phase: -Math.atan2(im, re) };
}

function fft(re: Float64Array, im: Float64Array, inverse: boolean): void {
  const n = re.length;
  for (let i = 1, j = 0; i < n; i++) {
    let bit = n >> 1;
    for (; j & bit; bit >>= 1) j ^= bit;
    j ^= bit;
    if (i < j) {
      const tr = re[i];
      re[i] = re[j];
      re[j] = tr;
      const ti = im[i];
      im[i] = im[j];
      im[j] = ti;
    }
  }
  for (let len = 2; len <= n; len <<= 1) {
    const ang = ((inverse ? 2 : -2) * Math.PI) / len;
    const wlenRe = Math.cos(ang);
    const wlenIm = Math.sin(ang);
    for (let i = 0; i < n; i += len) {
      let wRe = 1;
      let wIm = 0;
      const half = len >> 1;
      for (let j = 0; j < half; j++) {
        const uRe = re[i + j];
        const uIm = im[i + j];
        const vRe = re[i + j + half] * wRe - im[i + j + half] * wIm;
        const vIm = re[i + j + half] * wIm + im[i + j + half] * wRe;
        re[i + j] = uRe + vRe;
        im[i + j] = uIm + vIm;
        re[i + j + half] = uRe - vRe;
        im[i + j + half] = uIm - vIm;
        const nextRe = wRe * wlenRe - wIm * wlenIm;
        wIm = wRe * wlenIm + wIm * wlenRe;
        wRe = nextRe;
      }
    }
  }
  if (inverse) {
    for (let i = 0; i < n; i++) {
      re[i] /= n;
      im[i] /= n;
    }
  }
}

function bandpass(x: Float64Array, fs: number, f0: number, f1: number): Float64Array {
  const n = nextPow2(x.length);
  const re = new Float64Array(n);
  const im = new Float64Array(n);
  re.set(x);
  fft(re, im, false);
  const df = fs / n;
  for (let k = 0; k < n; k++) {
    const f = k <= n / 2 ? k * df : (k - n) * df;
    const abs = Math.abs(f);
    if (abs < f0 || abs > f1) {
      re[k] = 0;
      im[k] = 0;
    }
  }
  fft(re, im, true);
  return re.slice(0, x.length);
}

function highpass(x: Float64Array, fs: number, cutoff: number): Float64Array {
  return bandpass(x, fs, cutoff, fs / 2);
}

function detrendLinear(x: Float64Array): Float64Array {
  let n = 0;
  let sumT = 0;
  let sumX = 0;
  let sumTT = 0;
  let sumTX = 0;
  for (let i = 0; i < x.length; i++) {
    if (!Number.isFinite(x[i])) continue;
    n++;
    sumT += i;
    sumX += x[i];
    sumTT += i * i;
    sumTX += i * x[i];
  }
  const out = new Float64Array(x.length);
  if (n < 2) return out;
  const denom = n * sumTT - sumT * sumT;
  const slope = denom === 0 ? 0 : (n * sumTX - sumT * sumX) / denom;
  const intercept = (sumX - slope * sumT) / n;
  for (let i = 0; i < x.length; i++) {
    out[i] = Number.isFinite(x[i]) ? x[i] - (intercept + slope * i) : 0;
  }
  return out;
}

function interp(trace: WaveTrace, grid: Float64Array, wrap: boolean): Float64Array {
  const out = filled(grid.length, NaN);
  if (!trace || trace.t.length < 2) return out;
  const values = wrap ? unwrap(trace.v) : trace.v;
  let j = 0;
  for (let i = 0; i < grid.length; i++) {
    const t = grid[i];
    if (t < trace.t[0] || t > trace.t[trace.t.length - 1]) continue;
    while (j < trace.t.length - 2 && trace.t[j + 1] < t) j++;
    const t0 = trace.t[j];
    const t1 = trace.t[j + 1];
    if (t1 - t0 > 2) continue;
    const u = t1 === t0 ? 0 : (t - t0) / (t1 - t0);
    out[i] = values[j] * (1 - u) + values[j + 1] * u;
  }
  return out;
}

function timeGrid(t0: number, t1: number, fs: number): Float64Array {
  const n = Math.max(2, Math.floor((t1 - t0) * fs));
  const grid = new Float64Array(n);
  for (let i = 0; i < n; i++) grid[i] = t0 + i / fs;
  return grid;
}

function hann(n: number): Float64Array {
  const w = new Float64Array(n);
  for (let i = 0; i < n; i++) w[i] = n === 1 ? 1 : 0.5 * (1 - Math.cos((2 * Math.PI * i) / (n - 1)));
  return w;
}

function sinc(x: number): number {
  if (Math.abs(x) < 1e-8) return 1;
  return Math.sin(x) / x;
}

function resonanceWeight(f: number, fNat: number): number {
  const width = 0.15 * fNat;
  const z = (f - fNat) / width;
  return 1 - 0.7 * Math.exp(-z * z);
}

function nearPeriod(period: number, natural: number, tol: number): boolean {
  if (period <= 0 || natural <= 0) return false;
  return Math.abs(period - natural) / natural < tol;
}

function periodAtPeak(f: Float64Array, power: Float64Array): number {
  const smooth = smooth3(power);
  let peak = 0;
  for (let i = 1; i < smooth.length; i++) if (smooth[i] > smooth[peak]) peak = i;
  return f[peak] > 0 ? 1 / f[peak] : 0;
}

function chooseRoot(roots: number[], target: number): number | null {
  if (!roots.length) return null;
  let best = roots[0];
  let dist = Math.abs(roots[0] - target);
  for (const root of roots) {
    const d = Math.abs(root - target);
    if (d < dist) {
      best = root;
      dist = d;
    }
  }
  return best;
}

function periodOf(roots: number[], encounter: number): number | null {
  const omega = chooseRoot(roots, (2 * Math.PI) / encounter);
  return omega == null ? null : (2 * Math.PI) / omega;
}

function smooth3(x: Float64Array): Float64Array {
  const y = new Float64Array(x.length);
  for (let i = 0; i < x.length; i++) {
    const a = x[Math.max(0, i - 1)];
    const c = x[Math.min(x.length - 1, i + 1)];
    y[i] = (a + x[i] + c) / 3;
  }
  return y;
}

function sumEnergy(power: Float64Array, df: number): number {
  let s = 0;
  for (let i = 0; i < power.length; i++) s += power[i];
  return s * df;
}

function maskRange(f: Float64Array, f0: number, f1: number): boolean[] {
  return Array.from(f, (value) => value >= f0 && value <= f1);
}

function pick(values: Float64Array, mask: boolean[]): Float64Array {
  const kept: number[] = [];
  for (let i = 0; i < values.length; i++) if (mask[i]) kept.push(values[i]);
  return Float64Array.from(kept);
}

function filled(n: number, value: number): Float64Array {
  const out = new Float64Array(n);
  out.fill(value);
  return out;
}

function finiteValues(values: Float64Array): number[] {
  const out: number[] = [];
  for (let i = 0; i < values.length; i++) if (Number.isFinite(values[i])) out.push(values[i]);
  return out;
}

function fractionNan(a: Float64Array, b: Float64Array): number {
  let n = 0;
  for (let i = 0; i < a.length; i++) if (!Number.isFinite(a[i]) || !Number.isFinite(b[i])) n++;
  return a.length ? n / a.length : 1;
}

function meanFinite(values: Float64Array): number {
  const kept = finiteValues(values);
  return kept.length ? mean(kept) : 0;
}

function meanAbsFinite(values: Float64Array): number {
  const kept = finiteValues(values).map((value) => Math.abs(value));
  return kept.length ? mean(kept) : 0;
}

function stdFinite(values: Float64Array): number {
  return std(finiteValues(values));
}

function mean(values: number[]): number {
  if (!values.length) return 0;
  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function std(values: number[]): number {
  if (values.length < 2) return 0;
  const m = mean(values);
  return Math.sqrt(values.reduce((sum, value) => sum + (value - m) ** 2, 0) / values.length);
}

function max(values: Float64Array): number {
  let m = 0;
  for (let i = 0; i < values.length; i++) if (values[i] > m) m = values[i];
  return m;
}

function median(values: number[]): number {
  const sorted = values.slice().sort((a, b) => a - b);
  return sorted[sorted.length >> 1] ?? 0;
}

function diffs(times: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < times.length; i++) out.push(times[i] - times[i - 1]);
  return out;
}

function peakAmps(x: Float64Array, fs: number, from: number): number[] {
  const amps: number[] = [];
  const minGap = Math.max(2, Math.round(0.3 * fs));
  let last = from - minGap;
  for (let i = from; i < x.length - 1; i++) {
    if (i - last < minGap) continue;
    const peak = (x[i] >= x[i - 1] && x[i] > x[i + 1]) || (x[i] <= x[i - 1] && x[i] < x[i + 1]);
    if (peak) {
      amps.push(Math.abs(x[i]));
      last = i;
    }
  }
  return amps;
}

function circularMean(values: Float64Array): number {
  let s = 0;
  let c = 0;
  let n = 0;
  for (let i = 0; i < values.length; i++) {
    if (!Number.isFinite(values[i])) continue;
    s += Math.sin(values[i]);
    c += Math.cos(values[i]);
    n++;
  }
  if (!n) return 0;
  return Math.atan2(s, c);
}

function circularStdDeg(values: number[]): number {
  let s = 0;
  let c = 0;
  for (const value of values) {
    s += Math.sin(value);
    c += Math.cos(value);
  }
  const r = Math.hypot(s, c) / values.length;
  return Math.sqrt(-2 * Math.log(Math.max(r, 1e-12))) * (180 / Math.PI);
}

function headingSpanDeg(unwrapped: number[]): number {
  let min = Infinity;
  let max = -Infinity;
  for (const value of unwrapped) {
    const deg = (value * 180) / Math.PI;
    if (deg < min) min = deg;
    if (deg > max) max = deg;
  }
  return max - min;
}

function unwrap(values: number[]): number[] {
  if (!values.length) return [];
  const out = [values[0]];
  for (let i = 1; i < values.length; i++) {
    let delta = values[i] - values[i - 1];
    while (delta > Math.PI) delta -= 2 * Math.PI;
    while (delta < -Math.PI) delta += 2 * Math.PI;
    out.push(out[i - 1] + delta);
  }
  return out;
}

function wrapDeg(deg: number): number {
  const wrapped = deg % 360;
  return wrapped < 0 ? wrapped + 360 : wrapped;
}

function wrapRad(rad: number): number {
  const wrapped = rad % (2 * Math.PI);
  return wrapped < -Math.PI ? wrapped + 2 * Math.PI : wrapped > Math.PI ? wrapped - 2 * Math.PI : wrapped;
}

function rateOf(trace?: WaveTrace): number | null {
  if (!trace || trace.t.length < 3) return null;
  const dt: number[] = [];
  for (let i = 1; i < trace.t.length; i++) {
    const d = trace.t[i] - trace.t[i - 1];
    if (d > 1e-6) dt.push(d);
  }
  if (!dt.length) return null;
  dt.sort((a, b) => a - b);
  return 1 / dt[dt.length >> 1];
}

function unique(flags: string[]): string[] {
  return [...new Set(flags.filter((flag) => flag))];
}

function uniqueNumbers(values: number[]): number[] {
  const kept: number[] = [];
  for (const value of values) {
    if (kept.every((have) => Math.abs(have - value) / have > 0.02)) kept.push(value);
  }
  return kept;
}

function cap(current: WaveConfidence, limit: WaveConfidence): WaveConfidence {
  const rank: Record<WaveConfidence, number> = { high: 3, medium: 2, low: 1, none: 0 };
  return rank[current] <= rank[limit] ? current : limit;
}

function nextPow2(n: number): number {
  let p = 1;
  while (p < n) p <<= 1;
  return Math.max(2, p);
}

function decimateIndexes(n: number, fs: number, nativeHz?: number): number[] | null {
  if (nativeHz == null || nativeHz >= fs - 0.1) return null;
  const step = Math.max(1, Math.round(fs / nativeHz));
  const keep: number[] = [];
  for (let i = 0; i < n; i += step) keep.push(i);
  return keep;
}

function take(t: number[], values: Float64Array, keep: number[] | null): WaveTrace {
  if (!keep) return { t: t.slice(), v: Array.from(values) };
  return { t: keep.map((i) => t[i]), v: keep.map((i) => values[i]) };
}

function takeConstant(t: number[], value: number, keep: number[] | null): WaveTrace {
  const idx = keep ?? t.map((_, i) => i);
  return { t: idx.map((i) => t[i]), v: idx.map(() => value) };
}

function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rng: () => number): number {
  const u = Math.max(rng(), 1e-12);
  const v = rng();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
