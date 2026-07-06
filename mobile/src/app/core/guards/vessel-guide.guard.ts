import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ContentService } from '../services/content.service';
import { GuideLoadService } from '../services/guide-load.service';

export const vesselGuideGuard: CanActivateFn = (route) => {
  const content = inject(ContentService);
  const guideLoad = inject(GuideLoadService);
  const router = inject(Router);

  const slug = route.paramMap.get('vesselSlug');
  if (!slug) {
    return router.createUrlTree(['/v', 'cattitude', 'error']);
  }

  if (guideLoad.hasError && guideLoad.slug === slug) {
    return router.createUrlTree(['/v', slug, 'error']);
  }

  if (!content.loaded) {
    return router.createUrlTree(['/v', slug, 'error']);
  }

  if (content.bootstrap.vesselSlug !== slug) {
    return router.createUrlTree(['/v', slug, 'error']);
  }

  return true;
};
