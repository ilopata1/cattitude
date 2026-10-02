import { InstrumentMapService } from '../services/instrument-map.service';
import { SailPlanService } from '../services/sail-plan.service';

/**
 * Vessel-agnostic boot. Guide resolve/load/error belongs to `vesselGuideGuard`.
 * Both services already have a local fallback, so this does not wait on the
 * network — that wait would blank first paint on a hung link.
 */
export function appInitializer(
  sailPlans: SailPlanService,
  instrumentMaps: InstrumentMapService,
) {
  return async () => {
    void sailPlans.ensureLoaded();
    void instrumentMaps.ensureLoaded();
  };
}
