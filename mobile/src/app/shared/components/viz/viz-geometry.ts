/** Shape only. Colours stay in CSS (`currentColor` or `--cattitude-*`). */

export interface CsGaugeZone {
  from: number;
  to: number;
  tone: 'warning' | 'alarm';
}

const RADIUS = 42;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

/** 240° arc, gap centred on the bottom. Stroke starts at 150° (lower left). */
export const GAUGE = {
  width: 120,
  height: 100,
  cx: 60,
  cy: 58,
  r: RADIUS,
  start: 150,
  sweep: 240,
  circumference: Math.round(CIRCUMFERENCE * 1000) / 1000,
  arcLength: Math.round((240 / 360) * CIRCUMFERENCE * 1000) / 1000,
} as const;

export function arcFraction(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !(max > min)) return 0;
  return Math.min(1, Math.max(0, (value - min) / (max - min)));
}

/** Dash offset that reveals the arc from its start as `fraction` goes 0 → 1. */
export function arcDashOffset(fraction: number, arcLength: number): number {
  return arcLength * (1 - fraction);
}

export function formatGaugeValue(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(value * 10) / 10;
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
}

export function arcZonePath(from: number, to: number, min: number, max: number): string | null {
  if (!(max > min) || !Number.isFinite(from) || !Number.isFinite(to)) return null;
  const span = max - min;
  const startValue = Math.max(min, Math.min(max, from));
  const endValue = Math.max(min, Math.min(max, to));
  if (!(endValue > startValue)) return null;
  const start = GAUGE.start + ((startValue - min) / span) * GAUGE.sweep;
  const end = GAUGE.start + ((endValue - min) / span) * GAUGE.sweep;
  return arcPath(GAUGE.cx, GAUGE.cy, GAUGE.r, start, end);
}

export interface SparkPoint {
  x: number;
  y: number;
}

export interface SparkFigure {
  line: string;
  fill: string;
  dot: SparkPoint | null;
}

export function sparklineLayout(
  values: readonly number[],
  min: number | null,
  max: number | null,
  width = 100,
  height = 28,
  pad = 3,
): SparkFigure {
  const finite = values.filter(value => Number.isFinite(value));
  if (!finite.length) return { line: '', fill: '', dot: null };
  let lo = min != null && Number.isFinite(min) ? min : Math.min(...finite);
  let hi = max != null && Number.isFinite(max) ? max : Math.max(...finite);
  if (hi < lo) {
    const swap = lo;
    lo = hi;
    hi = swap;
  }
  if (hi === lo) {
    lo -= 1;
    hi += 1;
  }
  const span = hi - lo;
  const points = finite.map((value, index) => {
    const x = finite.length === 1 ? width / 2 : (index / (finite.length - 1)) * width;
    const fraction = Math.min(1, Math.max(0, (value - lo) / span));
    const y = pad + (1 - fraction) * (height - pad * 2);
    return { x: round2(x), y: round2(y) };
  });
  const line = points.map(point => `${point.x},${point.y}`).join(' ');
  const last = points[points.length - 1];
  return {
    line,
    fill: `${line} ${width},${height} 0,${height}`,
    dot: last,
  };
}

export function levelFillWidth(fill: number | null): number | null {
  if (fill == null || !Number.isFinite(fill)) return null;
  return Math.min(100, Math.max(0, fill));
}

export function levelZoneRect(zone: CsGaugeZone): { x: number; width: number } | null {
  if (!Number.isFinite(zone.from) || !Number.isFinite(zone.to)) return null;
  const from = Math.max(0, Math.min(100, zone.from));
  const to = Math.max(0, Math.min(100, zone.to));
  if (!(to > from)) return null;
  return { x: round2(from), width: round2(to - from) };
}

export type WindSide = 'port' | 'starboard' | 'ahead';

/** Boat-relative angle: 0 ahead, 1–180 starboard, 180–360 port. */
export function windSide(angle: number | null): WindSide {
  if (angle == null || !Number.isFinite(angle)) return 'ahead';
  const normalized = ((angle % 360) + 360) % 360;
  if (normalized === 0 || normalized === 180) return 'ahead';
  return normalized < 180 ? 'starboard' : 'port';
}

export function displayHeadingDeg(value: number): string {
  if (!Number.isFinite(value)) return '—';
  const rounded = Math.round(((value % 360) + 360) % 360) % 360;
  return String(rounded);
}

export interface CompassTick {
  bearing: number;
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  major: boolean;
  label: string | null;
  lx: number;
  ly: number;
}

const CARD_LABELS: Record<number, string> = { 0: 'N', 90: 'E', 180: 'S', 270: 'W' };

export function compassTicks(): CompassTick[] {
  const ticks: CompassTick[] = [];
  for (let bearing = 0; bearing < 360; bearing += 30) {
    const major = bearing % 90 === 0;
    const outer = polar(bearing, 86);
    const inner = polar(bearing, major ? 70 : 78);
    const labelAt = polar(bearing, 58);
    ticks.push({
      bearing,
      x1: inner.x,
      y1: inner.y,
      x2: outer.x,
      y2: outer.y,
      major,
      label: CARD_LABELS[bearing] ?? null,
      lx: labelAt.x,
      ly: labelAt.y,
    });
  }
  return ticks;
}

/** Triangle on the card rim at an absolute compass bearing. North is up. */
export function compassCogPoints(bearing: number): string {
  const tip = polar(bearing, 90);
  const left = polar(bearing - 8, 76);
  const right = polar(bearing + 8, 76);
  return `${tip.x},${tip.y} ${left.x},${left.y} ${right.x},${right.y}`;
}

function arcPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number): string | null {
  const sweep = endDeg - startDeg;
  if (!(sweep > 0.01)) return null;
  const start = arcPoint(cx, cy, r, startDeg);
  const end = arcPoint(cx, cy, r, endDeg);
  const large = sweep > 180 ? 1 : 0;
  return `M ${start.x.toFixed(2)} ${start.y.toFixed(2)} A ${r} ${r} 0 ${large} 1 ${end.x.toFixed(2)} ${end.y.toFixed(2)}`;
}

function arcPoint(cx: number, cy: number, r: number, deg: number): { x: number; y: number } {
  const rad = (deg * Math.PI) / 180;
  return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
}

function polar(bearing: number, radius: number, cx = 100, cy = 100): { x: number; y: number } {
  const rad = ((bearing - 90) * Math.PI) / 180;
  return {
    x: round2(cx + radius * Math.cos(rad)),
    y: round2(cy + radius * Math.sin(rad)),
  };
}

function round2(value: number): number {
  return Math.round(value * 100) / 100;
}
