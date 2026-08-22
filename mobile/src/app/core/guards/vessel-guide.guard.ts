import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContentService } from '../services/content.service';
import { GuideLoadService } from '../services/guide-load.service';
import { InstrumentMapService } from '../services/instrument-map.service';
import { SailPlanService } from '../services/sail-plan.service';
import { VesselContextService } from '../services/vessel-context.service';

/** Ensure the guide for `:vesselSlug` is loaded before entering tab routes. */
export const vesselGuideGuard: CanActivateFn = async (route) => {
  const content = inject(ContentService);
  const guideLoad = inject(GuideLoadService);
  const vesselContext = inject(VesselContextService);
  const sailPlans = inject(SailPlanService);
  const instrumentMaps = inject(InstrumentMapService);
  const router = inject(Router);

  const slug = route.paramMap.get('vesselSlug');
  if (!slug) {
    return router.createUrlTree(['/v', 'cattitude', 'error']);
  }

  vesselContext.setVesselSlug(slug);

  const needsLoad =
    !content.loaded || content.bootstrap.vesselSlug !== slug;

  if (needsLoad) {
    try {
      await content.loadBootstrapContent(slug);
      guideLoad.clearError();
      await sailPlans.ensureLoaded();
      await instrumentMaps.ensureLoaded();
    } catch (error) {
      guideLoad.setError(slug, error);
      return router.createUrlTree(['/v', slug, 'error']);
    }
  }

  if (guideLoad.hasError && guideLoad.slug === slug) {
    return router.createUrlTree(['/v', slug, 'error']);
  }

  return true;
};
