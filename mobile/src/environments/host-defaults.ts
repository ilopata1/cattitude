/**
 * Hostname → vessel opened at `/` and legacy `/tabs` URLs.
 * An explicit `/v/{slug}` path is never rewritten.
 * VesselResolverService is the only reader.
 */
export const HOST_DEFAULT_SLUGS: Readonly<Record<string, string>> = {
  'app.sailsupernova.com': 'supernova',
};
