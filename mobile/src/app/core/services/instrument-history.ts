import { liveVmcKn, liveVmgKn } from '../nav/made-good';
import { SailEssentialsLive, WindSteerLive } from '../models/instrument-map.model';
import { Passage } from '../models/logbook.model';

/** Ten minutes at one sample every ten seconds. */
export const HISTORY_SAMPLE_MS = 10_000;
export const HISTORY_CAPACITY = 60;

export const HISTORY_ROLES = [
  'depth',
  'speed',
  'sog',
  'aws',
  'tws',
  'heading',
  'cog',
  'awa',
  'twa',
  'vmg',
  'vmc',
] as const;

export type HistoryRole = typeof HISTORY_ROLES[number];

export interface HistorySampleInput {
  essentials: SailEssentialsLive;
  wind: WindSteerLive;
  position?: { lat: number; lon: number } | null;
  passage?: Passage | null;
}

/**
 * One sample per fresh reading. Stale essentials and unfresh wind (including
 * the empty 0° snapshot) are left out so a dropout does not draw a fake zero.
 */
export function historySample(input: HistorySampleInput): Partial<Record<HistoryRole, number>> {
  const sample: Partial<Record<HistoryRole, number>> = {};
  const take = (role: HistoryRole, value: number | null | undefined, fresh: boolean) => {
    if (!fresh || value == null || !Number.isFinite(value)) return;
    sample[role] = value;
  };
  if (!input.essentials.stale) {
    take('depth', input.essentials.depthM, true);
    take('speed', input.essentials.speedKn, true);
    take('sog', input.essentials.sogKnots, true);
  }
  take('aws', input.wind.aws, input.wind.awsFresh);
  take('tws', input.wind.tws, input.wind.twsFresh);
  take('heading', input.wind.heading, input.wind.headingFresh);
  take('cog', input.wind.cog, input.wind.cogFresh);
  take('awa', input.wind.awa, input.wind.awaFresh);
  take('twa', input.wind.twa, input.wind.twaFresh);
  const vmg = liveVmgKn(input.essentials, input.wind);
  if (vmg != null) sample.vmg = vmg;
  const vmc = liveVmcKn(input.essentials, input.wind, input.position ?? null, input.passage ?? null);
  if (vmc != null) sample.vmc = vmc;
  return sample;
}

export function pushHistorySample(
  samples: readonly number[],
  value: number,
  capacity = HISTORY_CAPACITY,
): readonly number[] {
  if (!Number.isFinite(value) || capacity < 1) return samples;
  const kept = samples.length >= capacity
    ? samples.slice(samples.length - capacity + 1)
    : samples.slice();
  kept.push(value);
  return kept;
}

export function applyHistorySample(
  series: Partial<Record<HistoryRole, readonly number[]>>,
  sample: Partial<Record<HistoryRole, number>>,
  capacity = HISTORY_CAPACITY,
): Partial<Record<HistoryRole, readonly number[]>> {
  let changed = false;
  const next: Partial<Record<HistoryRole, readonly number[]>> = { ...series };
  for (const role of HISTORY_ROLES) {
    const value = sample[role];
    if (value == null || !Number.isFinite(value)) continue;
    next[role] = pushHistorySample(series[role] ?? [], value, capacity);
    changed = true;
  }
  return changed ? next : series;
}
