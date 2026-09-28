export const environment = {
  production: false,
  apiUrl: 'http://localhost:8000',
  /** Site root and legacy /tabs redirects. Every slug loads its guide from the API. */
  defaultVesselSlug: 'cattitude',
  /** Base URL where the Skip instrument panel is served. Dev: ng serve on port 4201. */
  skipUrl: 'http://localhost:4201/@halos-org/skip/',
};
