import { ContentService } from '../services/content.service';
import { GuideLoadService } from '../services/guide-load.service';
import { VesselContextService } from '../services/vessel-context.service';
import { VesselResolverService } from '../services/vessel-resolver.service';

export function appInitializer(
  content: ContentService,
  resolver: VesselResolverService,
  vesselContext: VesselContextService,
  guideLoad: GuideLoadService,
) {
  return async () => {
    const slug = resolver.resolveSlugFromLocation();
    vesselContext.setVesselSlug(slug);

    try {
      await content.loadBootstrapContent(slug);
      guideLoad.clearError();
    } catch (error) {
      guideLoad.setError(slug, error);
    }
  };
}
