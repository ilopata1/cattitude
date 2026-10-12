/**
 * A published speed through water below this is treated as "no log", so speed
 * over ground can take over. About 0.1 knot.
 */
export const STW_MIN_USEFUL_MPS = 0.05;

/** About 1 knot. At or above this, speed over ground still shows way on. */
export const UNDERWAY_SOG_MPS = 1 / 1.94384;

/**
 * How long a real speed-through-water reading is kept across interspersed zeros.
 * A zero that is still arriving after this is a dead log, or a boat that has
 * stopped in the water, and speed over ground may take over.
 */
export const STW_DROPOUT_HOLD_MS = 8_000;

export interface StwDropoutContext {
  /** Last accepted speed through water, m/s. */
  previousMps: number | undefined;
  /** When that value was accepted. */
  previousAtMs: number | null;
  /** Latest speed over ground, m/s. */
  sogMps: number | undefined;
}

/**
 * True when `nextMps` is a near-zero speed through water that should be ignored.
 * The boat is still under way, and a real log reading is only a few seconds old.
 * A sustained zero, a stopped boat, or a log that has never reported a speed
 * returns false so the caller can store the reading and fall back to speed over ground.
 */
export function isInterspersedStwZero(
  nextMps: number,
  context: StwDropoutContext,
  nowMs: number,
): boolean {
  if (!Number.isFinite(nextMps) || Math.abs(nextMps) >= STW_MIN_USEFUL_MPS) {
    return false;
  }
  const sog = context.sogMps;
  if (sog === undefined || !Number.isFinite(sog) || Math.abs(sog) < UNDERWAY_SOG_MPS) {
    return false;
  }
  const previous = context.previousMps;
  if (
    previous === undefined ||
    !Number.isFinite(previous) ||
    Math.abs(previous) < STW_MIN_USEFUL_MPS ||
    context.previousAtMs == null ||
    nowMs - context.previousAtMs > STW_DROPOUT_HOLD_MS
  ) {
    return false;
  }
  return true;
}
