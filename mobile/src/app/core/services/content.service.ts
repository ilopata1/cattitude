import { Injectable } from '@angular/core';
import { Title } from '@angular/platform-browser';
import {
  BootstrapContent,
  Checklist,
  FixCard,
  LocationZone,
  SystemModule,
} from '../models/bootstrap-content.model';
import { GuideSyncService } from './guide-sync.service';
import { VesselContextService } from './vessel-context.service';
import { VesselRouteService } from './vessel-route.service';

export type GuideLoadFailure = 'offline' | 'missing' | 'failed';

const OFFLINE_GUIDE_MESSAGE =
  "This boat's guide isn't on this phone yet. Connect to the internet once to download it.";

export class GuideLoadError extends Error {
  constructor(
    readonly vesselSlug: string,
    message = `Unable to load guide for vessel "${vesselSlug}".`,
    readonly failure: GuideLoadFailure = 'failed',
  ) {
    super(message);
    this.name = 'GuideLoadError';
  }
}

@Injectable({ providedIn: 'root' })
export class ContentService {
  private content: BootstrapContent | null = null;

  constructor(
    private readonly vesselContext: VesselContextService,
    private readonly guideSync: GuideSyncService,
    private readonly vesselRoutes: VesselRouteService,
    private readonly title: Title,
  ) {}

  async loadBootstrapContent(slug: string): Promise<BootstrapContent> {
    try {
      const synced = await this.guideSync.ensureGuide(slug);
      return this.applyLoadedContent(synced, slug);
    } catch (error) {
      console.warn('Guide sync failed; trying local cache.', error);
      const cached = await this.guideSync.loadFromCache(slug);
      if (cached) {
        return this.applyLoadedContent(cached, slug);
      }
      throw this.toLoadError(slug, error);
    }
  }

  private toLoadError(slug: string, error: unknown): GuideLoadError {
    const status = (error as { status?: number } | null)?.status;
    const offline =
      (typeof navigator !== 'undefined' && navigator.onLine === false) ||
      status === 0;
    if (offline) {
      return new GuideLoadError(slug, OFFLINE_GUIDE_MESSAGE, 'offline');
    }
    if (status === 404) {
      return new GuideLoadError(slug, `No published guide for "${slug}".`, 'missing');
    }
    const detail = error instanceof Error ? error.message : 'Guide sync failed.';
    return new GuideLoadError(
      slug,
      `Unable to load guide for vessel "${slug}" from the API. ${detail}`,
    );
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
    return this.bootstrap.ui.systemOrder
      .map((id) => this.bootstrap.systems[id])
      .filter((system): system is SystemModule => !!system);
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

  private applyLoadedContent(content: BootstrapContent, slug: string): BootstrapContent {
    const prepared = this.prefixVesselRoutes(structuredClone(content) as BootstrapContent, slug);
    this.content = prepared;
    this.vesselContext.applyResolvedContext({
      vesselId: prepared.vesselId,
      vesselSlug: prepared.vesselSlug,
    });
    this.applyDocumentTitle(prepared);
    return prepared;
  }

  private applyDocumentTitle(content: BootstrapContent): void {
    const { vesselName, charterCompany } = content.branding;
    const parts = [vesselName, charterCompany].filter(Boolean);
    if (parts.length) {
      this.title.setTitle(parts.join(' — '));
    }
  }

  private prefixVesselRoutes(content: BootstrapContent, slug: string): BootstrapContent {
    const ui = content.ui;
    if (ui?.homeRuleSections) {
      for (const section of ui.homeRuleSections) {
        for (const rule of section.rules ?? []) {
          if (rule.link) {
            rule.link = this.vesselRoutes.resolveAppUrl(rule.link, slug);
          }
        }
      }
    }
    if (ui?.doMenu) {
      for (const section of ui.doMenu) {
        for (const item of section.items ?? []) {
          if (item.route) {
            item.route = this.vesselRoutes.resolveAppUrl(item.route, slug);
          }
        }
      }
    }
    return content;
  }
}
