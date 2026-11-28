/**
 * Magnetic bearings for display.
 *
 * Instrument values stay in the frame they arrive in (normally true), so the
 * wind, VMG, VMC, polar, A/B test and logbook maths never mix frames. Only the
 * figures and dials a person reads are turned to magnetic here.
 *
 * Signal K `navigation.magneticVariation` is radians, east positive, so
 * magnetic = true − variation.
 *
 * Without a variation a true bearing cannot be turned to magnetic. It is then
 * shown as it is and labelled °T, never passed off as °M.
 */
import { normalizeAngleDeg } from '../../instruments/skip/wind-steer.util';
import { WindSteerLive } from '../models/instrument-map.model';

export type BearingRef = 'true' | 'magnetic';

export const MAGNETIC_VARIATION_PATH = 'navigation.magneticVariation';

/** A bearing ready to show, with the north it is measured from. */
export interface DisplayBearing {
  deg: number;
  ref: BearingRef;
}

/** The north a mapped Signal K path is measured from. */
export function pathBearingRef(path: string | null | undefined): BearingRef {
  return path != null && /Magnetic$/.test(path) ? 'magnetic' : 'true';
}

/**
 * The bearing in magnetic when it can be, otherwise as it came.
 * `variationDeg` is degrees east of true north; null when unknown.
 */
export function displayBearing(deg: number, ref: BearingRef, variationDeg: number | null): DisplayBearing {
  if (ref === 'magnetic' || variationDeg == null || !Number.isFinite(variationDeg)) {
    return { deg, ref };
  }
  return { deg: normalizeAngleDeg(deg - variationDeg), ref: 'magnetic' };
}

/** °M or °T. */
export function bearingUnit(ref: BearingRef): string {
  return ref === 'magnetic' ? '°M' : '°T';
}

/** "247°M", or an em dash when the reading is not fresh. */
export function formatBearing(deg: number, ref: BearingRef, variationDeg: number | null, fresh: boolean): string {
  if (!fresh || !Number.isFinite(deg)) return '—';
  const shown = displayBearing(deg, ref, variationDeg);
  return `${Math.round(normalizeAngleDeg(shown.deg)) % 360}${bearingUnit(shown.ref)}`;
}

/** Heading, COG and true wind direction, each in the frame it will be drawn in. */
export interface DisplayCompass {
  /** The north the card is drawn against. Follows the heading. */
  ref: BearingRef;
  heading: number;
  /** Null when COG cannot be put in the card's frame. */
  cog: number | null;
  /** True wind direction (`wind.twa`); null when it cannot be put in the card's frame. */
  twd: number | null;
}

/**
 * Heading, COG and true wind direction for a compass card or wind-steer rose,
 * all against one north. The card follows the heading; COG and wind join it
 * when they can be brought into that frame and are left off when they cannot,
 * so a mark never sits a variation's width away from where it belongs.
 */
export function displayCompass(wind: WindSteerLive): DisplayCompass {
  const variation = wind.variation;
  const heading = displayBearing(wind.heading, wind.headingRef, variation);
  const inFrame = (deg: number, ref: BearingRef): number | null => {
    if (!Number.isFinite(deg)) return null;
    const shown = displayBearing(deg, ref, variation);
    if (shown.ref === heading.ref) return shown.deg;
    // The heading is magnetic from the compass and nothing gives a variation:
    // a true value cannot join it, and a magnetic one cannot be undone.
    return null;
  };
  return {
    ref: heading.ref,
    heading: heading.deg,
    cog: inFrame(wind.cog, wind.cogRef),
    // TWD is worked out from the heading, so it shares the heading's north.
    twd: inFrame(wind.twa, wind.headingRef),
  };
}
