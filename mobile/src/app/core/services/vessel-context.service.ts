import { Injectable } from '@angular/core';
import { VesselContext } from '../models/bootstrap-content.model';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class VesselContextService {
  private context: VesselContext = {
    vesselId: null,
    vesselSlug: environment.defaultVesselSlug,
    charterCompanyId: null,
    charterId: null,
    guestToken: this.readGuestTokenFromUrl(),
  };

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
