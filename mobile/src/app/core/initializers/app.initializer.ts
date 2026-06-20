import { ContentService } from '../services/content.service';
import { environment } from '../../../environments/environment';

export function appInitializer(content: ContentService) {
  return () => content.loadBootstrapContent(environment.vesselSlug);
}
