import { HOST_DEFAULT_SLUGS } from './host-defaults';

export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  /**
   * Fallback when this hostname is not in hostDefaultSlugs.
   * Site root and legacy /tabs URLs ask VesselResolverService, which reads the map.
   */
  defaultVesselSlug: 'cattitude',
  hostDefaultSlugs: HOST_DEFAULT_SLUGS,
};
