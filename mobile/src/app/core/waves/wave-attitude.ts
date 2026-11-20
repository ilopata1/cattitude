/**
 * Signal K often publishes pitch and roll together on navigation.attitude,
 * and more than one device can publish that path. The estimator wants one
 * numeric pitch trace and one numeric roll trace from the steadier, faster source.
 */

import { WaveTrace } from './wave-estimator';

export interface AttitudeParts {
  pitch: number | null;
  roll: number | null;
}

export interface AttitudeBucket {
  pitch: WaveTrace;
  roll: WaveTrace;
}

export function attitudeParts(value: unknown): AttitudeParts | null {
  const direct = partsFrom(value);
  if (direct) return direct;
  if (!value || typeof value !== 'object') return null;
  return partsFrom((value as Record<string, unknown>)['value']);
}

/** `$source` distinguishes two devices publishing the same path. */
export function attitudeSourceId(update: { $source?: string; source?: { label?: string } }): string {
  const tagged = update.$source?.trim();
  if (tagged) return tagged;
  return update.source?.label?.trim() || '';
}

/** The source with both pitch and roll and the highest sample rate. */
export function fasterAttitude<T extends AttitudeBucket>(buckets: Iterable<T>): T | null {
  let best: T | null = null;
  let bestRate = -1;
  for (const bucket of buckets) {
    const rate = overlapRate(bucket.pitch, bucket.roll);
    if (rate == null || rate <= bestRate) continue;
    best = bucket;
    bestRate = rate;
  }
  return best;
}

function partsFrom(value: unknown): AttitudeParts | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const record = value as Record<string, unknown>;
  if ('values' in record && record['values'] && typeof record['values'] === 'object') return null;
  const pitch = finiteNumber(record['pitch']);
  const roll = finiteNumber(record['roll']);
  if (pitch == null && roll == null) return null;
  return { pitch, roll };
}

function finiteNumber(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function overlapRate(pitch: WaveTrace, roll: WaveTrace): number | null {
  if (pitch.t.length < 2 || roll.t.length < 2) return null;
  const start = Math.max(pitch.t[0], roll.t[0]);
  const end = Math.min(pitch.t[pitch.t.length - 1], roll.t[roll.t.length - 1]);
  const span = end - start;
  const count = Math.min(pitch.t.length, roll.t.length);
  if (!(span > 0)) return count;
  return (count - 1) / span;
}
