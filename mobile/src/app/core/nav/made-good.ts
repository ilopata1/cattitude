/**
 * Live VMG and VMC.
 * VMG is boat speed along the true-wind axis (to windward, or down the wind
 * once the true angle is past a beam reach). VMC is speed over ground toward
 * the active passage destination, and is absent until that passage has departed.
 */
import { absoluteOffBow, windVmgKnots } from '../ab-test/ab-test';
import { COACH_VMG_DOWNWIND_TWA_DEG } from '../coach/coach-settings';
import { destinationBearingDeg, passageIsActive, vmgKnots } from '../logbook/logbook-math';
import { SailEssentialsLive, WindSteerLive } from '../models/instrument-map.model';
import { Passage } from '../models/logbook.model';

export function liveVmgKn(essentials: SailEssentialsLive, wind: WindSteerLive): number | null {
  if (essentials.stale || essentials.speedKn == null || !Number.isFinite(essentials.speedKn)) return null;
  if (!wind.headingFresh || !wind.twaFresh) return null;
  if (!Number.isFinite(wind.heading) || !Number.isFinite(wind.twa)) return null;
  const twa = absoluteOffBow(wind.twa, wind.heading);
  const knots = windVmgKnots(essentials.speedKn, twa, twa > COACH_VMG_DOWNWIND_TWA_DEG);
  if (!Number.isFinite(knots)) return null;
  return Math.round(knots * 10) / 10;
}

export function liveVmcKn(
  essentials: SailEssentialsLive,
  wind: WindSteerLive,
  position: { lat: number; lon: number } | null,
  passage: Passage | null,
): number | null {
  if (!passageIsActive(passage)) return null;
  if (essentials.stale || essentials.sogKnots == null || !Number.isFinite(essentials.sogKnots)) return null;
  if (!wind.cogFresh || !Number.isFinite(wind.cog)) return null;
  return vmgKnots(essentials.sogKnots, wind.cog, destinationBearingDeg(position, passage));
}
