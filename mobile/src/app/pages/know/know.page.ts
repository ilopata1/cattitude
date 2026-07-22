import { Component, OnInit } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
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
    private readonly sanitizer: DomSanitizer,
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

  /**
   * Trusted Stage 4 HTML. Rewrites legacy ``<a href="#">`` guide links to
   * ``<span>`` so ``<base href="/cattitude/">`` cannot send taps to Cattitude home.
   */
  trustedGuideHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(
      this.normalizeGuideHtml(html || ''),
    );
  }

  private normalizeGuideHtml(html: string): string {
    return html.replace(
      /<a\b([^>]*\bdata-guide-link="[^"]*"[^>]*)>([\s\S]*?)<\/a>/gi,
      (_full, attrs: string, body: string) => {
        const cleaned = attrs
          .replace(/\s*href\s*=\s*(["'])[\s\S]*?\1/gi, '')
          .replace(/\s*href\s*=\s*[^\s>]+/gi, '')
          .trim();
        return `<span role="link" tabindex="0" ${cleaned}>${body}</span>`;
      },
    );
  }

  /** Tap / keyboard activate ``data-guide-link`` inside enriched prose. */
  onGuideHtmlClick(event: Event): void {
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    const el = target.closest('[data-guide-link]') as HTMLElement | null;
    if (!el) {
      return;
    }
    event.preventDefault();
    event.stopPropagation();
    const token = (el.getAttribute('data-guide-link') || '').trim();
    void this.navigateGuideLink(token);
  }

  onGuideHtmlKeydown(event: KeyboardEvent): void {
    if (event.key !== 'Enter' && event.key !== ' ') {
      return;
    }
    const target = event.target;
    if (!(target instanceof Element)) {
      return;
    }
    if (!target.closest('[data-guide-link]')) {
      return;
    }
    event.preventDefault();
    this.onGuideHtmlClick(event);
  }

  private async navigateGuideLink(token: string): Promise<void> {
    if (!token) {
      return;
    }
    if (token.startsWith('system:')) {
      const systemId = token.slice('system:'.length);
      const system = this.content.getSystem(systemId);
      if (system) {
        this.openSystem(system);
      }
      return;
    }
    if (token === 'fix' || token.startsWith('fix:')) {
      const cat = token === 'fix' ? undefined : token.slice('fix:'.length);
      await this.vesselRoutes.navigateTabsWithExtras(
        ['fix'],
        cat ? { queryParams: { cat } } : undefined,
      );
      return;
    }
    if (token === 'do:learn' || token === 'learn') {
      await this.vesselRoutes.navigateTabs('do', 'learn');
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

  /** Registry place rows for ``equipment_locations`` sections. */
  sectionLocationRows(
    section: SystemSection,
  ): Array<{ name: string; location: string }> {
    const rows = section.rows;
    if (!Array.isArray(rows)) {
      return [];
    }
    return rows
      .map((row) => {
        if (!row || typeof row !== 'object') {
          return null;
        }
        const name = String((row as { name?: unknown }).name || '').trim();
        const location = String(
          (row as { location?: unknown }).location || '',
        ).trim();
        if (!name || !location) {
          return null;
        }
        return { name, location };
      })
      .filter((row): row is { name: string; location: string } => !!row);
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
    const cat = this.selected
      ? this.fixCategoryForSystem(this.selected.id)
      : undefined;
    void this.vesselRoutes.navigateTabsWithExtras(
      ['fix'],
      cat ? { queryParams: { cat } } : undefined,
    );
  }

  private fixCategoryForSystem(systemId: string): string | undefined {
    const map: Record<string, string> = {
      batteries: 'electrical',
      controls: 'electrical',
      electrical: 'electrical',
      nav: 'nav',
    };
    return map[systemId];
  }
}
