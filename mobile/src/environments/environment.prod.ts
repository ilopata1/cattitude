export const environment = {
  production: true,
  apiUrl: 'https://cattitude-production.up.railway.app',
  defaultVesselSlug: 'cattitude',
  /** @deprecated Use defaultVesselSlug; kept for transitional references. */
  vesselSlug: 'cattitude',
  bootstrapContentPath: 'data/bootstrap/cattitude.json',
  guideSyncEnabled: false,
  /** When false, only the defaultVesselSlug uses bundled JSON; other slugs load from the API. */
};
