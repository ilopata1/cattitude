/**
 * Boat and processing settings for the wave-height estimator.
 * Blank natural periods fall back to a hull preset until they are measured.
 */

export type HullType = 'mono' | 'cat';

export const G = 9.81;
export const KN_TO_MPS = 0.514444;

export interface WaveBoatSettings {
  /** Null until the crew chooses. The live service then infers from the vessel type. */
  hullType: HullType | null;
  /** Waterline length, metres. Null skips the hull-length correction. */
  lWl: number | null;
  /** Roll averaging width, metres. Mono: waterline beam. Cat: hull centreline spacing. */
  bRoll: number | null;
  /** Null uses the hull preset. */
  tRollNatural: number | null;
  tPitchNatural: number | null;
  /** Antenna forward of the centre of motion. Aft is negative. */
  antennaX: number;
  /** Antenna to starboard of the centreline. */
  antennaY: number;
  /** Antenna height above the waterline. Recorded with the installation. */
  antennaZ: number;
  /** Null uses the hull preset (1). */
  rollGain: number | null;
}

export interface ResolvedWaveConfig {
  hullType: HullType;
  lWl: number | null;
  bRoll: number | null;
  tRollNatural: number;
  tPitchNatural: number;
  antennaX: number;
  antennaY: number;
  antennaZ: number;
  rollGain: number;
  fs: number;
  windowS: number;
  stepS: number;
  welchSegS: number;
  welchOverlap: number;
  bandEncHz: [number, number];
  trueTLimits: [number, number];
  maxHeadingStdDeg: number;
  maxStwCv: number;
  maxHeadingJumpDeg: number;
  minCoherenceHeave: number;
  minNativeRateHz: number;
  rMin: number;
  resonanceTol: number;
}

export const WAVE_PRESETS: Record<HullType, { tRollNatural: number; tPitchNatural: number; rollGain: number }> = {
  mono: { tRollNatural: 5, tPitchNatural: 3.5, rollGain: 1 },
  cat: { tRollNatural: 2, tPitchNatural: 3, rollGain: 1 },
};

export const WAVE_PROCESSING = {
  windowS: 1200,
  stepS: 300,
  welchSegS: 256,
  welchOverlap: 0.5,
  bandEncHz: [0.04, 0.35] as [number, number],
  trueTLimits: [2.5, 25] as [number, number],
  maxHeadingStdDeg: 12,
  maxStwCv: 0.2,
  maxHeadingJumpDeg: 30,
  minCoherenceHeave: 0.5,
  rMin: 0.3,
  resonanceTol: 0.2,
};

export function defaultWaveSettings(): WaveBoatSettings {
  return {
    hullType: null,
    lWl: null,
    bRoll: null,
    tRollNatural: null,
    tPitchNatural: null,
    antennaX: 0,
    antennaY: 0,
    antennaZ: 0,
    rollGain: null,
  };
}

export function hullTypeForVessel(vesselType: string | null | undefined): HullType {
  const value = vesselType || '';
  if (value.includes('catamaran') || value.includes('trimaran')) return 'cat';
  return 'mono';
}

export function resolveWaveConfig(settings: WaveBoatSettings, vesselType?: string | null): ResolvedWaveConfig {
  const hullType = settings.hullType ?? hullTypeForVessel(vesselType);
  const preset = WAVE_PRESETS[hullType];
  const tRollNatural = positive(settings.tRollNatural) ?? preset.tRollNatural;
  const tPitchNatural = positive(settings.tPitchNatural) ?? preset.tPitchNatural;
  const rollGain = positive(settings.rollGain) ?? preset.rollGain;
  const tMin = Math.min(1 / WAVE_PROCESSING.bandEncHz[1], tRollNatural, tPitchNatural);
  const minNativeRateHz = 4 / tMin;
  const fs = Math.max(4, Math.ceil(minNativeRateHz * 1.5));
  return {
    hullType,
    lWl: positive(settings.lWl),
    bRoll: positive(settings.bRoll),
    tRollNatural,
    tPitchNatural,
    antennaX: finite(settings.antennaX),
    antennaY: finite(settings.antennaY),
    antennaZ: finite(settings.antennaZ),
    rollGain,
    fs,
    minNativeRateHz,
    ...WAVE_PROCESSING,
  };
}

export interface WaveSettingsFields {
  hullType: HullType;
  lWl: string;
  bRoll: string;
  tRoll: string;
  tPitch: string;
  antennaX: string;
  antennaY: string;
  antennaZ: string;
  rollGain: string;
}

export function waveSettingsFromFields(fields: WaveSettingsFields): { settings: WaveBoatSettings | null; error: string } {
  const lWl = optionalNumber(fields.lWl, 'Waterline length', { min: 2, max: 80 });
  const bRoll = optionalNumber(fields.bRoll, 'Roll width', { min: 0.5, max: 40 });
  const tRoll = optionalNumber(fields.tRoll, 'Natural roll period', { min: 0.5, max: 20 });
  const tPitch = optionalNumber(fields.tPitch, 'Natural pitch period', { min: 0.5, max: 20 });
  const antennaX = optionalNumber(fields.antennaX, 'Antenna forward position', { min: -40, max: 40, blank: 0 });
  const antennaY = optionalNumber(fields.antennaY, 'Antenna starboard position', { min: -20, max: 20, blank: 0 });
  const antennaZ = optionalNumber(fields.antennaZ, 'Antenna height', { min: 0, max: 40, blank: 0 });
  const rollGain = optionalNumber(fields.rollGain, 'Roll gain', { min: 0.2, max: 3 });
  const parsed = [lWl, bRoll, tRoll, tPitch, antennaX, antennaY, antennaZ, rollGain];
  const error = parsed.find((item) => item.error)?.error ?? '';
  if (error) return { settings: null, error };
  if (fields.hullType !== 'mono' && fields.hullType !== 'cat') {
    return { settings: null, error: 'Choose monohull or catamaran.' };
  }
  return {
    error: '',
    settings: {
      hullType: fields.hullType,
      lWl: lWl.value,
      bRoll: bRoll.value,
      tRollNatural: tRoll.value,
      tPitchNatural: tPitch.value,
      antennaX: antennaX.value ?? 0,
      antennaY: antennaY.value ?? 0,
      antennaZ: antennaZ.value ?? 0,
      rollGain: rollGain.value,
    },
  };
}

export function normalizeWaveSettings(value: unknown): WaveBoatSettings {
  const raw = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  const hull = raw['hullType'];
  return {
    hullType: hull === 'mono' || hull === 'cat' ? hull : null,
    lWl: optionalStored(raw['lWl']),
    bRoll: optionalStored(raw['bRoll']),
    tRollNatural: optionalStored(raw['tRollNatural']),
    tPitchNatural: optionalStored(raw['tPitchNatural']),
    antennaX: finite(raw['antennaX']),
    antennaY: finite(raw['antennaY']),
    antennaZ: finite(raw['antennaZ']),
    rollGain: optionalStored(raw['rollGain']),
  };
}

function positive(value: number | null | undefined): number | null {
  return value != null && Number.isFinite(value) && value > 0 ? value : null;
}

function finite(value: unknown): number {
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function optionalStored(value: unknown): number | null {
  if (value == null || value === '') return null;
  const n = typeof value === 'number' ? value : Number(value);
  return Number.isFinite(n) ? n : null;
}

function optionalNumber(
  raw: string,
  label: string,
  bounds: { min: number; max: number; blank?: number },
): { value: number | null; error: string } {
  const text = raw.trim();
  if (!text) return { value: bounds.blank ?? null, error: '' };
  const n = Number(text);
  if (!Number.isFinite(n)) return { value: null, error: `${label} needs a number.` };
  if (n < bounds.min || n > bounds.max) {
    return { value: null, error: `${label} should be between ${bounds.min} and ${bounds.max}.` };
  }
  return { value: n, error: '' };
}
