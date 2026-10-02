import { Injectable } from '@angular/core';
import { VesselContext } from '../models/bootstrap-content.model';
import { VesselResolverService } from './vessel-resolver.service';

@Injectable({ providedIn: 'root' })
export class VesselContextService {
  private context: VesselContext;

  constructor(resolver: VesselResolverService) {
    this.context = {
      vesselId: null,
      vesselSlug: resolver.resolveSlugFromLocation(),
      charterCompanyId: null,
      charterId: null,
      guestToken: this.readGuestTokenFromUrl(),
    };
  }

  get snapshot(): VesselContext {
    return { ...this.context };
  }

  get vesselSlug(): string {
    return this.context.vesselSlug;
  }

  get vesselId(): string | null {
    return this.context.vesselId;
  }

  setVesselSlug(slug: string): void {
    this.context = { ...this.context, vesselSlug: slug };
  }

  /** Called when API resolves slug or guest token to a vessel record. */
  applyResolvedContext(partial: Partial<VesselContext>): void {
    this.context = { ...this.context, ...partial };
  }

  private readGuestTokenFromUrl(): string | null {
    if (typeof window === 'undefined') {
      return null;
    }
    return new URLSearchParams(window.location.search).get('token');
  }
}
