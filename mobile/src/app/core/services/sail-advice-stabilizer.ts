import { SailAdvice, SailPlan } from '../models/sail-plan.model';
import { adviceBandKey, stillNearCrossoverExit } from './sail-plan-advisor';

/** Seconds a new band must persist before replacing the displayed recommendation. */
const BAND_DWELL_MS = 12_000;
/** Instantly accept a new band after a large step (tack, bear away, wind shift). */
const MAJOR_TWA_JUMP_DEG = 15;
const MAJOR_TWS_JUMP_KN = 4;

/**
 * Stabilizes sail-plan advice for the Polar UI:
 * - Primary recommendation changes only after a short dwell, unless TWA/TWS jumps hard
 *   (so a course change or wind shift still updates promptly).
 * - Near-cutover hint uses enter/exit hysteresis so it does not flicker on the seam.
 */
export class SailAdviceStabilizer {
  private displayed: SailAdvice | null = null;
  private pending: SailAdvice | null = null;
  private pendingSince = 0;
  private stickyNear = false;
  private lastHint: string | undefined;
  private lastTwa: number | null = null;
  private lastTws: number | null = null;

  reset(): void {
    this.displayed = null;
    this.pending = null;
    this.pendingSince = 0;
    this.stickyNear = false;
    this.lastHint = undefined;
    this.lastTwa = null;
    this.lastTws = null;
  }

  update(
    plan: SailPlan | null,
    raw: SailAdvice | null,
    twaDeg: number | null,
    twsKnots: number | null,
    now = Date.now(),
  ): SailAdvice | null {
    if (!raw || twaDeg === null || twsKnots === null || !plan) {
      this.reset();
      return null;
    }

    const twa = Math.abs(twaDeg);
    const tws = twsKnots;
    const majorJump =
      this.lastTwa !== null &&
      this.lastTws !== null &&
      (Math.abs(twa - this.lastTwa) >= MAJOR_TWA_JUMP_DEG ||
        Math.abs(tws - this.lastTws) >= MAJOR_TWS_JUMP_KN);

    this.lastTwa = twa;
    this.lastTws = tws;

    // --- Near-cutover hysteresis ---
    if (raw.nearCrossover) {
      this.stickyNear = true;
      this.lastHint = raw.crossoverHint;
    } else if (this.stickyNear && !stillNearCrossoverExit(plan, twa, tws)) {
      this.stickyNear = false;
      this.lastHint = undefined;
    }

    // --- Band / primary dwell ---
    if (!this.displayed) {
      this.displayed = this.withNear(raw);
      this.pending = null;
      return this.displayed;
    }

    const sameBand = adviceBandKey(raw) === adviceBandKey(this.displayed);
    if (sameBand) {
      this.pending = null;
      // Same band: refresh alts / notes / polar hint from live; keep sticky near.
      this.displayed = this.withNear(raw);
      return this.displayed;
    }

    if (majorJump) {
      this.displayed = this.withNear(raw);
      this.pending = null;
      this.pendingSince = 0;
      // After a big shift, re-seed near from the new cell.
      this.stickyNear = raw.nearCrossover;
      this.lastHint = raw.crossoverHint;
      return this.displayed;
    }

    if (!this.pending || adviceBandKey(this.pending) !== adviceBandKey(raw)) {
      this.pending = raw;
      this.pendingSince = now;
      return this.withNear(this.displayed);
    }

    if (now - this.pendingSince >= BAND_DWELL_MS) {
      this.displayed = this.withNear(this.pending);
      this.pending = null;
      this.stickyNear = this.displayed.nearCrossover;
      this.lastHint = this.displayed.crossoverHint;
      return this.displayed;
    }

    return this.withNear(this.displayed);
  }

  private withNear(base: SailAdvice): SailAdvice {
    if (!this.stickyNear) {
      return {
        ...base,
        nearCrossover: false,
        crossoverHint: undefined,
      };
    }
    return {
      ...base,
      nearCrossover: true,
      crossoverHint:
        this.lastHint ??
        'Near a sail-plan cutover — neighboring sail options may also fit.',
    };
  }
}
