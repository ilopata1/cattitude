import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContentService } from '../services/content.service';
import { GuideLoadService } from '../services/guide-load.service';
import { InstrumentMapService } from '../services/instrument-map.service';
import { SailPlanService } from '../services/sail-plan.service';
import { VesselContextService } from '../services/vessel-context.service';
import { VesselResolverService } from '../services/vessel-resolver.service';

/**
 * Single owner of guide loading. Tabs open only after `:vesselSlug` loads;
 * failure redirects to the vessel error route.
 */
export const vesselGuideGuard: CanActivateFn = async (route) => {
  const content = inject(ContentService);
  const guideLoad = inject(GuideLoadService);
  const vesselContext = inject(VesselContextService);
  const sailPlans = inject(SailPlanService);
  const instrumentMaps = inject(InstrumentMapService);
  const resolver = inject(VesselResolverService);
  const router = inject(Router);

  const slug = route.paramMap.get('vesselSlug');
  if (!slug) {
    return router.createUrlTree(['/v', resolver.defaultSlug(), 'error']);
  }

  vesselContext.setVesselSlug(slug);
  // Idempotent per slug. The initializer starts this for the URL slug; repeating
  // it here picks up a different vessel when the route changes.
  void sailPlans.ensureLoaded();
  void instrumentMaps.ensureLoaded();

  const needsLoad =
    !content.loaded || content.bootstrap.vesselSlug !== slug;

  if (needsLoad) {
    try {
      await content.loadBootstrapContent(slug);
      guideLoad.clearError();
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
