import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const SLUG_FROM_PATH_RE = /\/v\/([^/]+)/;

@Injectable({ providedIn: 'root' })
export class VesselResolverService {
  /**
   * Vessel for this visit. A `/v/{slug}` path wins on every host.
   * With no slug, the hostname's default is used, then `defaultVesselSlug`.
   */
  resolveSlugFromLocation(
    pathname = this.currentPathname(),
    hostname = this.currentHostname(),
  ): string {
    const fromPath = slugFromVesselPath(pathname);
    if (fromPath) {
      return fromPath;
    }
    return this.defaultSlug(hostname);
  }

  /** Vessel opened at `/` and legacy `/tabs` URLs on this host. */
  defaultSlug(hostname = this.currentHostname()): string {
    const mapped = environment.hostDefaultSlugs[hostname.toLowerCase()];
    return mapped ?? environment.defaultVesselSlug;
  }

  private currentPathname(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.location.pathname;
  }

  private currentHostname(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.location.hostname;
  }
}

function slugFromVesselPath(pathname: string): string | null {
  const match = pathname.match(SLUG_FROM_PATH_RE);
  if (!match?.[1]) {
    return null;
  }
  return decodeURIComponent(match[1]);
}
