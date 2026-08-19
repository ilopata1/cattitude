export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  defaultVesselSlug: 'cattitude',
  /** @deprecated Use defaultVesselSlug; kept for transitional references. */
  vesselSlug: 'cattitude',
  bootstrapContentPath: 'data/bootstrap/cattitude.json',
  guideSyncEnabled: true,
  /** Base URL where the Skip instrument panel is served. Dev: ng serve on port 4201. */
  skipUrl: 'http://localhost:4201/@halos-org/skip/',
};
