import { SailAdvice, SailPlan } from '../models/sail-plan.model';
import {
  adviceBandKey,
  collectCrossoverEdges,
  formatCrossoverHint,
} from './sail-plan-advisor';

/** Seconds a new band must persist before replacing the displayed recommendation. */
const BAND_DWELL_MS = 12_000;
/** Instantly accept a new band after a large step (tack, bear away, wind shift). */
const MAJOR_TWA_JUMP_DEG = 15;
const MAJOR_TWS_JUMP_KN = 4;
/** Keep a cutover in the hint this long after TWA/TWS leave the exit zone. */
const EDGE_DROP_MS = 10_000;

/**
 * Stabilizes sail-plan advice for the Polar UI:
 * - Primary recommendation changes only after a short dwell, unless TWA/TWS jumps hard
 *   (so a course change or wind shift still updates promptly).
 * - Each cutover edge in the hint uses enter/exit hysteresis independently, so a jittery
 *   TWS reading cannot add/remove "near N kn TWS" every second while TWA stays near.
 */
export class SailAdviceStabilizer {
  private displayed: SailAdvice | null = null;
  private pending: SailAdvice | null = null;
  private pendingSince = 0;
  private stickyHints = new Map<string, string>();
  private dropAfter = new Map<string, number>();
  private lastTwa: number | null = null;
  private lastTws: number | null = null;

  reset(): void {
    this.displayed = null;
    this.pending = null;
    this.pendingSince = 0;
    this.stickyHints.clear();
    this.dropAfter.clear();
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

    if (majorJump) {
      this.stickyHints.clear();
      this.dropAfter.clear();
    }
    this.updateStickyEdges(plan, twa, tws, now);

    // --- Band / primary dwell ---
    if (!this.displayed) {
      this.displayed = this.withNear(raw);
      this.pending = null;
      return this.displayed;
    }

    const sameBand = adviceBandKey(raw) === adviceBandKey(this.displayed);
    if (sameBand) {
      this.pending = null;
      this.displayed = this.withNear(raw);
      return this.displayed;
    }

    if (majorJump) {
      this.displayed = this.withNear(raw);
      this.pending = null;
      this.pendingSince = 0;
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
      return this.displayed;
    }

    return this.withNear(this.displayed);
  }

  private updateStickyEdges(
    plan: SailPlan,
    twa: number,
    tws: number,
    now: number,
  ): void {
    const edges = collectCrossoverEdges(plan, twa, tws);
    const byId = new Map(edges.map(e => [e.id, e]));

    for (const e of edges) {
      if (!e.inEnter) continue;
      this.stickyHints.set(e.id, e.hint);
      this.dropAfter.delete(e.id);
    }

    for (const id of [...this.stickyHints.keys()]) {
      const e = byId.get(id);
      if (e?.inEnter || e?.inExit) {
        this.dropAfter.delete(id);
        continue;
      }
      const since = this.dropAfter.get(id) ?? now;
      this.dropAfter.set(id, since);
      if (now - since >= EDGE_DROP_MS) {
        this.stickyHints.delete(id);
        this.dropAfter.delete(id);
      }
    }
  }

  private withNear(base: SailAdvice): SailAdvice {
    const hints = [...this.stickyHints.values()];
    const crossoverHint = formatCrossoverHint(hints);
    return {
      ...base,
      nearCrossover: !!crossoverHint,
      crossoverHint,
    };
  }
}
