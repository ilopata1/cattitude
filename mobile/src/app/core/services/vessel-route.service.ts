import { Injectable } from '@angular/core';
import { NavigationExtras, Router } from '@angular/router';
import { VesselContextService } from './vessel-context.service';

@Injectable({ providedIn: 'root' })
export class VesselRouteService {
  constructor(
    private readonly router: Router,
    private readonly vesselContext: VesselContextService,
  ) {}

  vesselRoot(slug?: string): string[] {
    return ['/v', slug ?? this.vesselContext.vesselSlug];
  }

  tabs(...segments: string[]): string[] {
    return [...this.vesselRoot(), 'tabs', ...segments];
  }

  navigateTabs(...segments: string[]): Promise<boolean> {
    return this.router.navigate(this.tabs(...segments));
  }

  navigateTabsWithExtras(
    segments: string[],
    extras?: NavigationExtras,
  ): Promise<boolean> {
    return this.router.navigate(this.tabs(...segments), extras);
  }

  /** Rewrite legacy `/tabs/…` paths from bootstrap JSON to vessel-scoped routes. */
  resolveAppUrl(url: string, slug?: string): string {
    const vesselSlug = slug ?? this.vesselContext.vesselSlug;
    if (url.startsWith('/v/')) {
      return url;
    }
    if (url.startsWith('/tabs')) {
      return `/v/${vesselSlug}${url}`;
    }
    if (url.startsWith('tabs/')) {
      return `/v/${vesselSlug}/${url}`;
    }
    return url;
  }
}
