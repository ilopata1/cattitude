import { Injectable } from '@angular/core';
import { environment } from '../../../environments/environment';

const SLUG_FROM_PATH_RE = /\/v\/([^/]+)/;

@Injectable({ providedIn: 'root' })
export class VesselResolverService {
  /** Parse vessel slug from the current URL path (`/v/{slug}/…`). */
  resolveSlugFromLocation(pathname = this.currentPathname()): string {
    const match = pathname.match(SLUG_FROM_PATH_RE);
    if (match?.[1]) {
      return decodeURIComponent(match[1]);
    }
    return environment.defaultVesselSlug;
  }

  private currentPathname(): string {
    if (typeof window === 'undefined') {
      return '';
    }
    return window.location.pathname;
  }
}
