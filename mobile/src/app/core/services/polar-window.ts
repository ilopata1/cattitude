/** How long a polar sample stays in the rolling buffer. Matches the longest window. */
export const POLAR_BUFFER_MS = 60 * 60 * 1000;
/** Live readings are recorded about once a second. */
export const POLAR_SAMPLE_INTERVAL_MS = 1_000;
/** A sample newer than this still counts as the current end of the window. */
export const POLAR_STALE_AFTER_MS = 15_000;

/**
 * True when live samples reach back across `windowMs` and the newest is still fresh.
 *
 * The buffer drops a sample as soon as it is strictly older than the window, so a
 * full window's oldest sample sits about one sample interval inside the far edge.
 * A single recent reading, or a reading left over after the instruments go quiet,
 * does not count.
 */
export function polarWindowCovered(
  samples: readonly { timestamp: number }[],
  windowMs: number,
  now: number,
  sampleIntervalMs = POLAR_SAMPLE_INTERVAL_MS,
  freshMs = POLAR_STALE_AFTER_MS,
): boolean {
  const cutoff = now - windowMs;
  let oldest = Infinity;
  let newest = -Infinity;
  for (const sample of samples) {
    if (sample.timestamp < cutoff || sample.timestamp > now) {
      continue;
    }
    if (sample.timestamp < oldest) {
      oldest = sample.timestamp;
    }
    if (sample.timestamp > newest) {
      newest = sample.timestamp;
    }
  }
  if (!Number.isFinite(oldest)) {
    return false;
  }
  return now - oldest >= windowMs - sampleIntervalMs && now - newest <= freshMs;
}
