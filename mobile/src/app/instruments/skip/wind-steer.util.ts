/**
 * Wind-steer angle helpers (from Skip widget-windsteer, MIT).
 * @see skip/src/app/widgets/widget-windsteer/widget-windsteer.component.ts
 */

function addHeadingDeg(h1: number, h2: number): number {
  let h3 = (h1 + h2) % 360;
  if (h3 < 0) h3 += 360;
  return h3;
}

/** Boat-relative true-wind angle vs compass-frame direction, depending on path and compass mode. */
export function computeTrueWindBaseAngle(
  path: string,
  value: number,
  heading: number,
  compassModeEnabled: boolean,
): number {
  const isBoatRelativeTrueWind =
    path.includes('angleTrueWater') || path.includes('angleTrueGround');
  return isBoatRelativeTrueWind && compassModeEnabled
    ? addHeadingDeg(heading, value)
    : value;
}

export function normalizeAngleDeg(a: number): number {
  return ((a % 360) + 360) % 360;
}

export function angleDeltaDeg(from: number, to: number): number {
  const d = ((to - from + 540) % 360) - 180;
  return Math.abs(d);
}
