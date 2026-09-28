import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import { ActivatedRoute, Router } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ContentService } from '../../core/services/content.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import {
  ChapterPresentation,
  classifySection,
  presentChapter,
} from '../../core/guide/chapter-presentation';
import { GuideSearchHit } from '../../core/search/guide-search';
import { scrollToElement } from '../../core/search/scroll-into-content';
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
  query = '';

  @ViewChild(IonContent) private ionContent?: IonContent;

  private presentedSystem: SystemModule | null = null;
  private presentedFixes: ReturnType<ContentService['getFixes']> | null = null;
  private presented: ChapterPresentation<SystemSection> | null = null;

  private pendingSection: number | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly vesselRoutes: VesselRouteService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  get locationLayout() {
    return this.content.bootstrap.ui.locationLayout;
  }

  get searching(): boolean {
    return this.query.trim().length >= 2;
  }

  get searchGroups() {
    return this.searching ? this.content.search(this.query) : [];
  }

  ngOnInit(): void {
    // Ionic keeps tab pages alive — subscribe so Learn → Know deep-links
    // re-apply on every navigation, not only the first construction.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const systemId = (params.get('system') || '').trim();
        if (!systemId) {
          return;
        }
        const system = this.content.getSystem(systemId);
        if (this.selected?.id !== system?.id) {
          this.closeReference();
        }
        this.selected = system ?? null;
        const section = params.get('section');
        this.pendingSection = section == null || section === '' ? null : Number(section);
        if (this.selected) {
          this.scrollToPendingSection();
        }
      });
  }

  setMode(mode: 'topic' | 'location'): void {
    this.mode = mode;
    this.selectedZone = null;
  }

  openSystem(system: SystemModule): void {
    this.closeReference();
    this.pendingSection = null;
    this.selected = system;
  }

  chapterOf(system: SystemModule): ChapterPresentation<SystemSection> {
    const fixes = this.content.getFixes();
    if (this.presented && this.presentedSystem === system && this.presentedFixes === fixes) {
      return this.presented;
    }
    this.presentedSystem = system;
    this.presentedFixes = fixes;
    this.presented = presentChapter(system, fixes);
    return this.presented;
  }

  openFixCard(slug: string): void {
    void this.vesselRoutes.navigateTabsWithExtras(['fix'], {
      queryParams: { card: slug, cat: null },
    });
  }

  openLearn(token: string): void {
    void this.navigateGuideLink(token);
  }

  openHit(hit: GuideSearchHit): void {
    this.query = '';
    if (hit.kind === 'chapter' && hit.systemId) {
      const next = this.content.getSystem(hit.systemId) ?? null;
      if (this.selected?.id !== next?.id) {
        this.closeReference();
      }
      this.selected = next;
      this.pendingSection = hit.sectionIndex ?? null;
      this.scrollToPendingSection();
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: {
          system: hit.systemId,
          section: hit.sectionIndex == null ? null : String(hit.sectionIndex),
        },
        queryParamsHandling: 'merge',
      });
      return;
    }
    if (hit.kind === 'checklist' && hit.checklistKey) {
      void this.vesselRoutes.navigateTabsWithExtras(['do', 'checklist', hit.checklistKey], {
        queryParams: { item: hit.item },
      });
      return;
    }
    if (hit.kind === 'fix' && hit.card) {
      void this.vesselRoutes.navigateTabsWithExtras(['fix'], {
        queryParams: { card: hit.card, cat: null },
      });
    }
  }

  closeDetail(): void {
    this.closeReference();
    this.selected = null;
    this.pendingSection = null;
    if (
      this.route.snapshot.queryParamMap.has('system') ||
      this.route.snapshot.queryParamMap.has('section')
    ) {
      void this.router.navigate([], {
        relativeTo: this.route,
        queryParams: { system: null, section: null },
        queryParamsHandling: 'merge',
        replaceUrl: true,
      });
    }
  }

  private scrollToPendingSection(): void {
    const index = this.pendingSection;
    const section =
      this.selected && index != null && !Number.isNaN(index)
        ? this.selected.sections[index]
        : undefined;
    const inReference = !!section && classifySection(section).role === 'reference';
    const id =
      index == null || Number.isNaN(index) ? 'know-sec-top' : `know-sec-${index}`;
    scrollToElement(
      this.ionContent,
      id,
      inReference ? () => this.openReference() : undefined,
    );
  }

  /** Reference is collapsed until the guest opens it, or a search hit is inside it. */
  private openReference(): void {
    const details = document.getElementById('know-reference');
    if (details instanceof HTMLDetailsElement) {
      details.open = true;
    }
  }

  private closeReference(): void {
    const details = document.getElementById('know-reference');
    if (details instanceof HTMLDetailsElement) {
      details.open = false;
    }
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
        // Name may be blank on successive rows for the same equipment.
        if (!location) {
          return null;
        }
        return { name, location };
      })
      .filter((row): row is { name: string; location: string } => !!row);
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

}
