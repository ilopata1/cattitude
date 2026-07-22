import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import {
  LocationZone,
  SystemModule,
  SystemSection,
} from '../../core/models/bootstrap-content.model';

@Component({
  selector: 'app-know',
  templateUrl: './know.page.html',
  styleUrls: ['./know.page.scss'],
  standalone: false,
})
export class KnowPage implements OnInit {
  mode: 'topic' | 'location' = 'topic';
  selected: SystemModule | null = null;
  selectedZone: string | null = null;

  constructor(
    public readonly content: ContentService,
    private readonly route: ActivatedRoute,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  get locationLayout() {
    return this.content.bootstrap.ui.locationLayout;
  }

  ngOnInit(): void {
    const systemId = this.route.snapshot.queryParamMap.get('system');
    if (systemId) {
      const system = this.content.getSystem(systemId);
      if (system) {
        this.selected = system;
      }
    }
  }

  setMode(mode: 'topic' | 'location'): void {
    this.mode = mode;
    this.selectedZone = null;
  }

  openSystem(system: SystemModule): void {
    this.selected = system;
  }

  closeDetail(): void {
    this.selected = null;
  }

  /** Phase 1b — tap ``data-guide-link="system:<id>"`` inside enriched prose. */
  onGuideHtmlClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const anchor = target.closest('a[data-guide-link]') as HTMLElement | null;
    if (!anchor) {
      return;
    }
    event.preventDefault();
    const token = (anchor.getAttribute('data-guide-link') || '').trim();
    const systemId = token.startsWith('system:')
      ? token.slice('system:'.length)
      : '';
    if (!systemId) {
      return;
    }
    const system = this.content.getSystem(systemId);
    if (system) {
      this.openSystem(system);
    }
  }

  selectZone(zoneId: string): void {
    this.selectedZone = this.selectedZone === zoneId ? null : zoneId;
  }

  zoneSystems(zoneId: string): SystemModule[] {
    const zone: LocationZone | undefined = this.content.getLocationZone(zoneId);
    if (!zone) {
      return [];
    }
    return zone.sys
      .map((id) => this.content.getSystem(id))
      .filter((system): system is SystemModule => !!system);
  }

  zoneLabel(zoneId: string): string {
    return this.content.getLocationZone(zoneId)?.label ?? zoneId;
  }

  /** Flatten steps/list/warnings/notes items to display strings. */
  sectionItems(section: SystemSection): string[] {
    const items = section.items;
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => this.itemLabel(item))
      .filter((label): label is string => !!label);
  }

  /** Hide consecutive duplicate O3 headings when one block splits into prose+list. */
  showSectionHeading(sections: SystemSection[], index: number): boolean {
    const title = (sections[index]?.t || '').trim();
    if (!title) {
      return false;
    }
    if (index === 0) {
      return true;
    }
    return (sections[index - 1]?.t || '').trim() !== title;
  }

  itemLabel(item: unknown): string {
    if (typeof item === 'string') {
      return item.trim();
    }
    if (item && typeof item === 'object') {
      const record = item as Record<string, unknown>;
      for (const key of ['c', 'text', 'content', 'label', 'title', 'body', 's']) {
        const value = record[key];
        if (typeof value === 'string' && value.trim()) {
          return value.trim();
        }
      }
    }
    return '';
  }

  goToFix(): void {
    void this.vesselRoutes.navigateTabs('fix');
  }
}
