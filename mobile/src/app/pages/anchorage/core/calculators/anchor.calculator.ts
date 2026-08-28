import {
  LatLon, VesselPosition, Vessel, VesselState, AisReferencePoint,
} from '../models/vessel.model';
import { enumerateWindFromBearingsInRange, normalizeDeg } from './wind-arc';

const EARTH_RADIUS = 6371000;
const DEG_TO_RAD = Math.PI / 180;

/**
 * Haversine great-circle distance between two WGS-84 points.
 * @returns distance in metres
 */
export function haversineDistance(a: LatLon, b: LatLon): number {
  const dLat = (b.lat - a.lat) * DEG_TO_RAD;
  const dLon = (b.lon - a.lon) * DEG_TO_RAD;
  const sinHalfLat = Math.sin(dLat / 2);
  const sinHalfLon = Math.sin(dLon / 2);
  const h =
    sinHalfLat * sinHalfLat +
    Math.cos(a.lat * DEG_TO_RAD) * Math.cos(b.lat * DEG_TO_RAD) * sinHalfLon * sinHalfLon;
  return 2 * EARTH_RADIUS * Math.asin(Math.sqrt(h));
}

/**
 * Least-squares closest-point-of-approach across all forward-projected heading
 * vectors.  Each position defines a ray from (lat, lon) in the compass-heading
 * direction.  We find the point that minimises the sum of squared perpendicular
 * distances to every ray (treated as an infinite line).
 *
 * Operates in a local Cartesian approximation (lat/lon treated as y/x) which
 * is accurate enough for anchorage-scale distances (< 1 km).
 */
export function computeAnchorPoint(positions: VesselPosition[]): LatLon | null {
  if (positions.length < 2) {
    return null;
  }

  // Accumulate the 2×2 normal-equation system  A · X = B
  // For each line i with direction di and point Pi:
  //   ni = unit normal to di = (-dy, dx)
  //   Contribution to A: ni · niᵀ  (outer product)
  //   Contribution to B: (ni · niᵀ) · Pi
  let a00 = 0;
  let a01 = 0;
  let a11 = 0;
  let b0 = 0;
  let b1 = 0;

  for (const pos of positions) {
    const headingRad = pos.heading * DEG_TO_RAD;
    // Direction vector (in a lat=y, lon=x frame):
    //   dx = sin(heading), dy = cos(heading)
    const dx = Math.sin(headingRad);
    const dy = Math.cos(headingRad);

    // Perpendicular (normal) to the direction: rotate 90° CW → (-dy, dx)
    const nx = -dy;
    const ny = dx;

    // Outer product ni·niᵀ contributes to the 2×2 matrix
    a00 += nx * nx;
    a01 += nx * ny;
    a11 += ny * ny;

    // Right-hand side: (ni·niᵀ) · Pi   where Pi = (lon, lat) in our x/y frame
    const px = pos.lon;
    const py = pos.lat;
    b0 += nx * nx * px + nx * ny * py;
    b1 += nx * ny * px + ny * ny * py;
  }

  // Solve 2×2 system via Cramer's rule
  const det = a00 * a11 - a01 * a01;
  if (Math.abs(det) < 1e-12) {
    return null; // lines are (near-)parallel — no unique intersection
  }

  const x = (b0 * a11 - b1 * a01) / det;
  const y = (a00 * b1 - a01 * b0) / det;

  return { lat: y, lon: x };
}

/**
 * Moves a reported fix to the bow on the centreline — where the rode actually
 * leaves the boat — using the AIS reference point.
 *
 * Without this the heading rays used for anchor fitting run through the
 * antenna, which is offset aft and (on ships) well off the centreline, biasing
 * the fitted anchor. Returns the fix unchanged when the offsets are unknown.
 */
export function toRodePoint(pos: VesselPosition, aisRef: AisReferencePoint): VesselPosition {
  const { fromBow, fromCenter } = aisRef;
  if (!fromBow && !fromCenter) return pos;

  let point: LatLon = { lat: pos.lat, lon: pos.lon };
  if (fromBow) {
    point = pointAtBearingDistance(point, fromBow, pos.heading);
  }
  if (fromCenter) {
    // +ve fromCenter means the antenna sits to port, so the centreline is that
    // far to starboard of it.
    point = pointAtBearingDistance(point, fromCenter, pos.heading + 90);
  }
  return { ...pos, lat: point.lat, lon: point.lon };
}

/**
 * Maximum distance from the anchor point to any recorded position, plus the
 * vessel's physical length.
 */
export function computeSwingRadius(
  anchorPoint: LatLon,
  positions: VesselPosition[],
  lengthMetres: number,
): number {
  let maxDist = 0;
  for (const pos of positions) {
    const d = haversineDistance(anchorPoint, { lat: pos.lat, lon: pos.lon });
    if (d > maxDist) {
      maxDist = d;
    }
  }
  return maxDist + lengthMetres;
}

/**
 * Same swing-circle severity rules as {@link computeState}, but for an arbitrary
 * centre-to-centre distance (e.g. instantaneous boat positions on swing circles).
 */
export function pairwiseSwingSeverityForDistance(
  dist: number,
  swingRadiusA: number,
  swingRadiusB: number,
  lengthMetresA: number,
  lengthMetresB: number,
): 'red' | 'amber' | 'green' {
  const largerRadius = Math.max(swingRadiusA, swingRadiusB);
  const smallerRadius = Math.min(swingRadiusA, swingRadiusB);
  const smallerBoatLength = swingRadiusA <= swingRadiusB ? lengthMetresA : lengthMetresB;

  if (largerRadius >= dist + smallerRadius - smallerBoatLength) {
    return 'red';
  }
  if (dist <= largerRadius) {
    return 'amber';
  }
  return 'green';
}

export function pairwiseSeverityBetweenAnchoredVessels(
  a: Vessel,
  b: Vessel,
): 'red' | 'amber' | 'green' | null {
  if (!a.anchorPoint || !b.anchorPoint) {
    return null;
  }
  const dist = haversineDistance(a.anchorPoint, b.anchorPoint);
  return pairwiseSwingSeverityForDistance(
    dist,
    a.swingRadius,
    b.swingRadius,
    a.lengthMetres,
    b.lengthMetres,
  );
}

/**
 * Destination point given start, rhumb-line-style small distance using spherical
 * formula (accurate for anchorage-scale distances).
 * @param bearingDeg clockwise from true north (0° = N, 90° = E).
 */
export function pointAtBearingDistance(anchor: LatLon, distanceM: number, bearingDeg: number): LatLon {
  const brng = bearingDeg * DEG_TO_RAD;
  const δ = distanceM / EARTH_RADIUS;
  const φ1 = anchor.lat * DEG_TO_RAD;
  const λ1 = anchor.lon * DEG_TO_RAD;
  const sinφ1 = Math.sin(φ1);
  const cosφ1 = Math.cos(φ1);
  const sinδ = Math.sin(δ);
  const cosδ = Math.cos(δ);
  const sinφ2 = sinφ1 * cosδ + cosφ1 * sinδ * Math.cos(brng);
  const φ2 = Math.asin(sinφ2);
  const y = Math.sin(brng) * sinδ * cosφ1;
  const x = cosδ - sinφ1 * sinφ2;
  const λ2 = λ1 + Math.atan2(y, x);
  return { lat: φ2 / DEG_TO_RAD, lon: λ2 / DEG_TO_RAD };
}

/** Bearing from anchor to boat when wind blows *from* {@param windFromDeg}. */
export function downwindBearingFromWindFrom(windFromDeg: number): number {
  return normalizeDeg(windFromDeg + 180);
}

export function boatPositionOnSwingForWind(
  anchor: LatLon,
  swingRadiusMetres: number,
  windFromDeg: number,
): LatLon {
  const bearing = downwindBearingFromWindFrom(windFromDeg);
  return pointAtBearingDistance(anchor, swingRadiusMetres, bearing);
}

const WIND_RANGE_SAMPLES = 37;

/**
 * True if for some wind direction in the inclusive range the same severity rules
 * applied to instantaneous downwind boat positions yield red or amber.
 */
export function canSwingConflictOccurForWindRange(
  vessel: Vessel,
  other: Vessel,
  windFromStartDeg: number,
  windFromEndDeg: number,
): boolean {
  if (!vessel.anchorPoint || !other.anchorPoint) {
    return false;
  }

  const winds = enumerateWindFromBearingsInRange(windFromStartDeg, windFromEndDeg, WIND_RANGE_SAMPLES);
  for (const w of winds) {
    const pa = boatPositionOnSwingForWind(vessel.anchorPoint, vessel.swingRadius, w);
    const pb = boatPositionOnSwingForWind(other.anchorPoint, other.swingRadius, w);
    const d = haversineDistance(pa, pb);
    const sev = pairwiseSwingSeverityForDistance(
      d,
      vessel.swingRadius,
      other.swingRadius,
      vessel.lengthMetres,
      other.lengthMetres,
    );
    if (sev === 'red' || sev === 'amber') {
      return true;
    }
  }
  return false;
}

/**
 * Downgrades base amber to green when wind filtering is enabled and no sampled
 * wind direction reproduces red/amber for any pairwise anchor-amber contributor.
 */
export function applyWindRangeToAnchoredState(
  baseState: VesselState,
  vessel: Vessel,
  allVessels: Vessel[],
  windEnabled: boolean,
  windFromStartDeg: number,
  windFromEndDeg: number,
): VesselState {
  if (!windEnabled) {
    return baseState;
  }
  if (baseState === 'unknown' || baseState === 'moving' || baseState === 'red' || baseState === 'green') {
    return baseState;
  }

  for (const other of allVessels) {
    if (other.mmsi === vessel.mmsi || !other.anchorPoint) {
      continue;
    }
    const anchorSev = pairwiseSeverityBetweenAnchoredVessels(vessel, other);
    if (anchorSev === 'red' || anchorSev === 'amber') {
      if (canSwingConflictOccurForWindRange(vessel, other, windFromStartDeg, windFromEndDeg)) {
        return 'amber';
      }
    }
  }

  return 'green';
}

/**
 * Determine the traffic-light state of a vessel relative to all others.
 *
 *  - unknown : no anchor point computed yet
 *  - red     : the larger swing circle extends past the near edge of the
 *              smaller circle (largerRadius >= dist + smallerRadius − boatLength
 *              of the vessel with the smaller radius)
 *  - amber   : the larger swing circle reaches the other vessel's anchor
 *              (dist <= largerRadius)
 *  - green   : no conflicts
 */
export function computeState(vessel: Vessel, allVessels: Vessel[]): VesselState {
  if (!vessel.anchorPoint) {
    return 'unknown';
  }

  let isAmber = false;

  for (const other of allVessels) {
    if (other.mmsi === vessel.mmsi) continue;
    if (!other.anchorPoint) continue;

    const sev = pairwiseSeverityBetweenAnchoredVessels(vessel, other);
    if (sev === 'red') {
      return 'red';
    }
    if (sev === 'amber') {
      isAmber = true;
    }
  }

  return isAmber ? 'amber' : 'green';
}
