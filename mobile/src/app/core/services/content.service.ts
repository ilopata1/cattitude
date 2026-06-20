import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import {
  BootstrapContent,
  Checklist,
  FixCard,
  LocationZone,
  SystemModule,
} from '../models/bootstrap-content.model';
import { SYSTEM_ORDER } from '../config/vessel-ui.config';
import { environment } from '../../../environments/environment';
import { VesselContextService } from './vessel-context.service';

@Injectable({ providedIn: 'root' })
export class ContentService {
  private content: BootstrapContent | null = null;

  constructor(
    private readonly http: HttpClient,
    private readonly vesselContext: VesselContextService,
  ) {}

  async loadBootstrapContent(slug = environment.vesselSlug): Promise<BootstrapContent> {
    const path = environment.bootstrapContentPath.replace('cattitude', slug);
    const content = await firstValueFrom(
      this.http.get<BootstrapContent>(path),
    );
    this.content = content;
    this.vesselContext.applyResolvedContext({
      vesselId: content.vesselId,
      vesselSlug: content.vesselSlug,
    });
    return content;
  }

  get loaded(): boolean {
    return this.content !== null;
  }

  get bootstrap(): BootstrapContent {
    if (!this.content) {
      throw new Error('Bootstrap content not loaded');
    }
    return this.content;
  }

  getSystems(): SystemModule[] {
    return Object.values(this.bootstrap.systems);
  }

  getSystem(id: string): SystemModule | undefined {
    return this.bootstrap.systems[id];
  }

  getChecklists(): { key: string; checklist: Checklist }[] {
    return Object.entries(this.bootstrap.checklists).map(([key, checklist]) => ({
      key,
      checklist,
    }));
  }

  getChecklist(key: string): Checklist | undefined {
    return this.bootstrap.checklists[key];
  }

  getSystemsOrdered(): SystemModule[] {
    return SYSTEM_ORDER.map((id) => this.bootstrap.systems[id]).filter(
      (system): system is SystemModule => !!system,
    );
  }

  getLocationZone(zoneId: string): LocationZone | undefined {
    return this.bootstrap.locations[zoneId];
  }

  getFixes(): FixCard[] {
    return this.bootstrap.fixes;
  }

  formatManualTitle(manualId: string): string {
    return (
      this.bootstrap.manualTitles[manualId] ??
      manualId.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
    );
  }
}
