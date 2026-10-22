/**
 * Display damping for live instruments.
 *
 * These time constants are display settings, not sensor settings.
 * This is the one place to tune how steady the numbers and needles feel.
 *
 * Heading, COG, STW, and SOG snap to the raw sample when the error stays
 * past the threshold. Depth and both wind vectors do not: depth only follows
 * its time constant, and a wind reversal has to slew through the origin.
 */

export const DAMPING_TAU_S = {
  heading: 1,
  cog: 2,
  stw: 2,
  sog: 2,
  depth: 2,
  /** AWA and AWS together, in the boat frame. */
  apparentWind: 2,
  /** True-wind direction and speed together, in the compass frame. */
  trueWind: 5,
} as const;

/** Fast recovery for the dampers that snap. Speeds are in knots. */
export const DAMPING_SNAP = {
  angleDeg: 25,
  speedFraction: 0.25,
  speedFloorKn: 1,
} as const;

/** A gap longer than this re-seeds instead of blending from a stale filter. */
export const GAP_RESET_MS = 10_000;

/** The error must stay past the snap threshold this long before a re-seed. */
export const SNAP_PERSIST_MS = 1_500;

/** How often damped values are published to the UI. */
export const DISPLAY_PUBLISH_MS = 500;

/**
 * A Signal K timestamp further than this from the local clock is ignored.
 * Boat clocks drift; a wild stamp would stretch or rewind the filter.
 */
export const TIMESTAMP_SKEW_MS = 5_000;

export interface SpeedSnap {
  fraction: number;
  floor: number;
}

export interface DampedVector {
  angleDeg: number;
  speed: number;
}

/**
 * Discrete step of a continuous first-order lag.
 * `dtMs` is the time since the previous accepted sample, not a fixed period.
 * A non-positive time constant passes the sample through.
 */
export function alphaFor(dtMs: number, tauS: number): number {
  if (!(tauS > 0)) return 1;
  return 1 - Math.exp(-(dtMs / 1000) / tauS);
}

/**
 * Sample time for a damper. Prefer the Signal K update timestamp when it
 * parses and sits within ±5 s of `nowMs`; otherwise use `nowMs`.
 */
export function sampleTimeMs(timestamp: string | undefined | null, nowMs: number): number {
  if (timestamp == null || timestamp === '') return nowMs;
  const parsed = Date.parse(timestamp);
  if (!Number.isFinite(parsed)) return nowMs;
  if (Math.abs(parsed - nowMs) > TIMESTAMP_SKEW_MS) return nowMs;
  return parsed;
}

export class ScalarDamper {
  private current: number | null = null;
  private lastT: number | null = null;
  private overSince: number | null = null;

  constructor(
    private readonly tauS: number,
    private readonly snap: SpeedSnap | null = null,
  ) {}

  get value(): number | null {
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.lastT = null;
    this.overSince = null;
  }

  push(value: number, tMs: number): number {
    if (this.mustSeed(tMs)) return this.seed(value, tMs);
    if (this.snap !== null && this.snapReady(value, tMs)) return this.seed(value, tMs);
    const alpha = alphaFor(tMs - (this.lastT as number), this.tauS);
    this.current = (this.current as number) + alpha * (value - (this.current as number));
    this.lastT = tMs;
    return this.current;
  }

  private mustSeed(tMs: number): boolean {
    if (this.current === null || this.lastT === null) return true;
    const dt = tMs - this.lastT;
    return dt <= 0 || dt > GAP_RESET_MS;
  }

  private seed(value: number, tMs: number): number {
    this.current = value;
    this.lastT = tMs;
    this.overSince = null;
    return value;
  }

  private snapReady(value: number, tMs: number): boolean {
    const snap = this.snap;
    const current = this.current;
    if (snap === null || current === null) return false;
    const limit = Math.max(snap.fraction * Math.abs(current), snap.floor);
    if (Math.abs(value - current) <= limit) {
      this.overSince = null;
      return false;
    }
    if (this.overSince === null) this.overSince = tMs;
    return tMs - this.overSince >= SNAP_PERSIST_MS;
  }
}

export class AngleDamper {
  private cos = 0;
  private sin = 0;
  private current: number | null = null;
  private lastT: number | null = null;
  private overSince: number | null = null;

  constructor(private readonly tauS: number) {}

  get value(): number | null {
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.lastT = null;
    this.overSince = null;
    this.cos = 0;
    this.sin = 0;
  }

  push(value: number, tMs: number): number {
    const raw = wrap360(value);
    if (this.mustSeed(tMs)) return this.seed(raw, tMs);
    if (this.snapReady(raw, tMs)) return this.seed(raw, tMs);
    const alpha = alphaFor(tMs - (this.lastT as number), this.tauS);
    const rad = (raw * Math.PI) / 180;
    this.cos += alpha * (Math.cos(rad) - this.cos);
    this.sin += alpha * (Math.sin(rad) - this.sin);
    this.current = wrap360((Math.atan2(this.sin, this.cos) * 180) / Math.PI);
    this.lastT = tMs;
    return this.current;
  }

  private mustSeed(tMs: number): boolean {
    if (this.current === null || this.lastT === null) return true;
    const dt = tMs - this.lastT;
    return dt <= 0 || dt > GAP_RESET_MS;
  }

  private seed(raw: number, tMs: number): number {
    const rad = (raw * Math.PI) / 180;
    this.cos = Math.cos(rad);
    this.sin = Math.sin(rad);
    this.current = raw;
    this.lastT = tMs;
    this.overSince = null;
    return raw;
  }

  private snapReady(raw: number, tMs: number): boolean {
    const current = this.current;
    if (current === null) return false;
    if (shortestErrorDeg(current, raw) <= DAMPING_SNAP.angleDeg) {
      this.overSince = null;
      return false;
    }
    if (this.overSince === null) this.overSince = tMs;
    return tMs - this.overSince >= SNAP_PERSIST_MS;
  }
}

export class VectorDamper {
  private x = 0;
  private y = 0;
  private current: DampedVector | null = null;
  private lastT: number | null = null;

  constructor(private readonly tauS: number) {}

  get value(): DampedVector | null {
    return this.current;
  }

  reset(): void {
    this.current = null;
    this.lastT = null;
    this.x = 0;
    this.y = 0;
  }

  push(angleDeg: number, speed: number, tMs: number): DampedVector {
    if (this.mustSeed(tMs)) return this.seed(angleDeg, speed, tMs);
    const alpha = alphaFor(tMs - (this.lastT as number), this.tauS);
    const rad = (wrap360(angleDeg) * Math.PI) / 180;
    const rawX = speed * Math.cos(rad);
    const rawY = speed * Math.sin(rad);
    this.x += alpha * (rawX - this.x);
    this.y += alpha * (rawY - this.y);
    this.lastT = tMs;
    this.current = {
      angleDeg: wrap360((Math.atan2(this.y, this.x) * 180) / Math.PI),
      speed: Math.hypot(this.x, this.y),
    };
    return this.current;
  }

  private mustSeed(tMs: number): boolean {
    if (this.current === null || this.lastT === null) return true;
    const dt = tMs - this.lastT;
    return dt <= 0 || dt > GAP_RESET_MS;
  }

  private seed(angleDeg: number, speed: number, tMs: number): DampedVector {
    const wrapped = wrap360(angleDeg);
    const rad = (wrapped * Math.PI) / 180;
    this.x = speed * Math.cos(rad);
    this.y = speed * Math.sin(rad);
    this.lastT = tMs;
    this.current = { angleDeg: wrapped, speed };
    return this.current;
  }
}

function wrap360(deg: number): number {
  return ((deg % 360) + 360) % 360;
}

function shortestErrorDeg(from: number, to: number): number {
  const delta = ((to - from + 540) % 360) - 180;
  return Math.abs(delta);
}
