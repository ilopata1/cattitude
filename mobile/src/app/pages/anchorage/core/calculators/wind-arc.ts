/** Normalise degrees to [0, 360). */
export function normalizeDeg(d: number): number {
  let x = d % 360;
  if (x < 0) x += 360;
  return x;
}

/** Clockwise span in [0, 360) from start to end (meteorological / compass bearing). */
export function clockwiseSpanDegrees(startDeg: number, endDeg: number): number {
  const s = normalizeDeg(startDeg);
  const e = normalizeDeg(endDeg);
  return ((e - s) % 360 + 360) % 360;
}

/**
 * Sample wind-from bearings along the clockwise arc from start to end (inclusive).
 * When start and end coincide, treats the range as a full circle.
 */
export function enumerateWindFromBearingsInRange(
  startDeg: number,
  endDeg: number,
  stepsAlongArc: number,
): number[] {
  const s = normalizeDeg(startDeg);
  const e = normalizeDeg(endDeg);
  const n = Math.max(2, Math.floor(stepsAlongArc));
  const out: number[] = [];

  if (Math.abs(s - e) < 1e-6) {
    for (let i = 0; i < n; i++) {
      out.push(normalizeDeg(s + (360 * i) / n));
    }
    return out;
  }

  const span = clockwiseSpanDegrees(s, e);
  for (let i = 0; i < n; i++) {
    const t = i / (n - 1);
    out.push(normalizeDeg(s + span * t));
  }
  return out;
}

/**
 * Smallest clockwise arc that contains all given bearings (degrees, wind-from).
 * Returns start/end as clockwise arc endpoints on the compass.
 */
export function smallestArcContainingBearings(degrees: number[]): { startDeg: number; endDeg: number } {
  if (degrees.length === 0) {
    return { startDeg: 0, endDeg: 360 };
  }

  const pts = degrees.map(normalizeDeg).filter(d => Number.isFinite(d));
  if (pts.length === 0) {
    return { startDeg: 0, endDeg: 360 };
  }

  const u = [...new Set(pts.map(p => Math.round(p * 1000) / 1000))].sort((a, b) => a - b);
  const m = u.length;

  if (m === 1) {
    const c = u[0];
    const span = 50;
    return { startDeg: normalizeDeg(c - span / 2), endDeg: normalizeDeg(c + span / 2) };
  }

  let maxGap = -1;
  let gapAfterIdx = 0;

  for (let i = 0; i < m; i++) {
    const j = (i + 1) % m;
    const gap = j === 0 ? (360 - u[m - 1] + u[0]) : (u[j] - u[i]);
    if (gap > maxGap) {
      maxGap = gap;
      gapAfterIdx = i;
    }
  }

  const startDeg = u[(gapAfterIdx + 1) % m];
  const endDeg = u[gapAfterIdx];
  return { startDeg: normalizeDeg(startDeg), endDeg: normalizeDeg(endDeg) };
}
