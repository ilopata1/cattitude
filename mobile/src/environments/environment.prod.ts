import { HOST_DEFAULT_SLUGS } from './host-defaults';

export const environment = {
  production: true,
  apiUrl: 'https://cattitude-production.up.railway.app',
  /**
   * Fallback when this hostname is not in hostDefaultSlugs.
   * app.sailsupernova.com defaults to supernova; other hosts, including the
   * native app, use this slug. Explicit /v/{slug} URLs are unchanged.
   */
  defaultVesselSlug: 'cattitude',
  hostDefaultSlugs: HOST_DEFAULT_SLUGS,
};
