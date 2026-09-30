import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const SLUG_FROM_PATH_RE = /\/v\/([^/]+)/;
/** This host is Supernova. Older visits stored the previous default, Cattitude. */
const SUPERNOVA_HOST = 'app.sailsupernova.com';

@Injectable({ providedIn: 'root' })
export class VesselResolverService {
  /** Parse vessel slug from the current URL path (`/v/{slug}/…`). */
  resolveSlugFromLocation(pathname = this.currentPathname()): string {
    const match = pathname.match(SLUG_FROM_PATH_RE);
    const slug = match?.[1]
      ? decodeURIComponent(match[1])
      : environment.defaultVesselSlug;
    if (this.currentHostname() === SUPERNOVA_HOST && slug === 'cattitude') {
      return 'supernova';
    }
    return slug;
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
