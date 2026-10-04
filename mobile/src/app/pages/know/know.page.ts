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
import {
  groupTopics,
  isPowerPart,
  POWER_TOPIC_ID,
  PowerPresentation,
  powerScrollTarget,
  powerSubtitle,
  presentPower,
  sectionDomId,
  topicIcon as powerTopicIcon,
  topicTitle as powerTopicTitle,
  TopicGroup,
} from '../../core/guide/power-topic';
import { GuideSearchHit } from '../../core/search/guide-search';
import { resolveWhereIndex, WhereItem } from '../../core/guide/where-index';
import { scrollToElement } from '../../core/search/scroll-into-content';
import {
  SystemModule,
  SystemSection,
} from '../../core/models/bootstrap-content.model';
import { ReaderView } from '../../core/guide/reader-view';
import { ReaderViewService } from '../../core/services/reader-view.service';

@Component({
  selector: 'app-know',
  templateUrl: './know.page.html',
  styleUrls: ['./know.page.scss'],
  standalone: false,
})
export class KnowPage implements OnInit {
  mode: 'topic' | 'location' = 'topic';
  locList: 'az' | 'zone' = 'az';
  selected: SystemModule | null = null;
  powerOpen = false;
  selectedZone: string | null = null;
  query = '';

  @ViewChild(IonContent) private ionContent?: IonContent;

  private presentedSystem: SystemModule | null = null;
  private presentedFixes: ReturnType<ContentService['getFixes']> | null = null;
  private presentedView: ReaderView | null = null;
  private presented: ChapterPresentation<SystemSection> | null = null;
  private powerMembers: SystemModule[] | null = null;
  private powerGalley: SystemModule | null = null;
  private powerFixes: ReturnType<ContentService['getFixes']> | null = null;
  private powerViewMode: ReaderView | null = null;
  private powerCached: PowerPresentation<SystemSection> | null = null;
  private topicBootstrap: ContentService['bootstrap'] | null = null;
  private topicCache: TopicGroup<SystemModule>[] | null = null;

  private pendingSection: number | null = null;
  private pendingSystemId: string | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    public readonly readerView: ReaderViewService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly vesselRoutes: VesselRouteService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  get searching(): boolean {
    return this.query.trim().length >= 2;
  }

  get hasBoatRules(): boolean {
    return (this.content.bootstrap.ui.homeRuleSections ?? []).some((section) => section.rules?.length);
  }

  openRules(): void {
    void this.vesselRoutes.navigateTabs('home', 'rules');
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
        const section = params.get('section');
        void this.vesselRoutes.navigateTabsWithExtras(
          ['know', systemId],
          {
            queryParams: section ? { section } : {},
            replaceUrl: true,
          },
        );
      });
  }

  setMode(mode: 'topic' | 'location' | undefined): void {
    if (mode !== 'topic' && mode !== 'location') {
      return;
    }
    this.mode = mode;
    this.selectedZone = null;
  }

  get whereIndex() {
    const ui = this.content.bootstrap.ui;
    return resolveWhereIndex(
      ui.whereIndex,
      this.content.bootstrap.systems,
      ui.systemOrder,
      this.content.bootstrap.branding.vesselType,
    );
  }

  azItems(): WhereItem[] {
    return this.whereIndex.items.slice().sort((left, right) => {
      const byName = left.name.localeCompare(right.name);
      return byName || left.location.localeCompare(right.location);
    });
  }

  zoneItems(zoneId: string): WhereItem[] {
    return this.whereIndex.items.filter((item) => item.zone === zoneId);
  }

  zoneTitle(zoneId: string): string {
    return this.whereIndex.zones.find((zone) => zone.id === zoneId)?.label || zoneId;
  }

  openWhere(item: WhereItem): void {
    this.openHit({
      kind: 'chapter',
      title: item.name,
      snippet: item.location,
      systemId: item.systemId,
      sectionIndex: item.sectionIndex,
    });
  }

  topics(): TopicGroup<SystemModule>[] {
    const bootstrap = this.content.bootstrap;
    if (this.topicBootstrap === bootstrap && this.topicCache) {
      return this.topicCache;
    }
    this.topicBootstrap = bootstrap;
    this.topicCache = groupTopics(this.content.getSystemsOrdered());
    return this.topicCache;
  }

  topicTitle(topic: TopicGroup<SystemModule>): string {
    return powerTopicTitle(topic);
  }

  topicIcon(topic: TopicGroup<SystemModule>): string {
    return powerTopicIcon(topic);
  }

  topicSubtitle(topic: TopicGroup<SystemModule>): string {
    if (topic.id === POWER_TOPIC_ID) {
      return powerSubtitle(topic.systems);
    }
    return topic.systems[0]?.subtitle || '';
  }

  openTopic(topic: TopicGroup<SystemModule>): void {
    if (topic.id === POWER_TOPIC_ID) {
      this.openPower(null, null);
      return;
    }
    const system = topic.systems[0];
    if (system) {
      this.openSystem(system);
    }
  }

  openLinkedSystem(id: string): void {
    if (isPowerPart(id) || id === POWER_TOPIC_ID) {
      this.openPower(id === POWER_TOPIC_ID ? null : id, null);
      return;
    }
    const system = this.content.getSystem(id);
    if (system) {
      this.openSystem(system);
    }
  }

  openSystem(system: SystemModule): void {
    void this.vesselRoutes.navigateTabs('know', system.id);
  }

  powerView(): PowerPresentation<SystemSection> | null {
    const members = this.content.getSystemsOrdered().filter((system) => isPowerPart(system.id));
    if (!members.length) {
      return null;
    }
    const view = this.readerView.view();
    const fixes = this.content.visibleFixes(view);
    const galley = this.content.getSystem('galley') ?? null;
    const sameMembers =
      !!this.powerMembers &&
      this.powerMembers.length === members.length &&
      this.powerMembers.every((system, index) => system === members[index]);
    if (
      sameMembers &&
      this.powerFixes === fixes &&
      this.powerGalley === galley &&
      this.powerViewMode === view &&
      this.powerCached
    ) {
      return this.powerCached;
    }
    this.powerMembers = members;
    this.powerFixes = fixes;
    this.powerGalley = galley;
    this.powerViewMode = view;
    this.powerCached = presentPower(members, fixes, galley, view);
    return this.powerCached;
  }

  chapterOf(system: SystemModule): ChapterPresentation<SystemSection> {
    const view = this.readerView.view();
    const fixes = this.content.visibleFixes(view);
    if (
      this.presented &&
      this.presentedSystem === system &&
      this.presentedFixes === fixes &&
      this.presentedView === view
    ) {
      return this.presented;
    }
    this.presentedSystem = system;
    this.presentedFixes = fixes;
    this.presentedView = view;
    this.presented = presentChapter(system, fixes, view);
    return this.presented;
  }

  openAsk(): void {
    void this.vesselRoutes.navigateTabs('more', 'ask');
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
      const section = hit.sectionIndex == null ? null : String(hit.sectionIndex);
      void this.vesselRoutes.navigateTabsWithExtras(
        ['know', hit.systemId],
        section ? { queryParams: { section } } : undefined,
      );
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

  get detailOpen(): boolean {
    return this.powerOpen || this.selected != null;
  }

  get detailTitle(): string {
    if (this.powerOpen) {
      return 'Power';
    }
    return this.selected?.title ?? '';
  }

  get detailSubtitle(): string {
    if (this.powerOpen) {
      return this.powerView()?.subtitle ?? '';
    }
    return this.selected?.subtitle ?? '';
  }

  closeDetail(): void {
    this.closeReference();
    this.powerOpen = false;
    this.selected = null;
    this.pendingSection = null;
    this.pendingSystemId = null;
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

  private openPower(systemId: string | null, index: number | null): void {
    void this.vesselRoutes.navigateTabsWithExtras(
      ['know', systemId || POWER_TOPIC_ID],
      index == null ? undefined : { queryParams: { section: String(index) } },
    );
  }

  private scrollToPendingSection(): void {
    if (this.powerOpen) {
      const power = this.powerView();
      const target = power
        ? powerScrollTarget(power, this.pendingSystemId, this.pendingSection)
        : { domId: 'know-sec-top', inReference: false };
      scrollToElement(
        this.ionContent,
        target.domId,
        target.inReference ? () => this.openReference() : undefined,
      );
      return;
    }
    const index = this.pendingSection;
    const section =
      this.selected && index != null && !Number.isNaN(index)
        ? this.selected.sections[index]
        : undefined;
    const inReference = !!section && classifySection(section).role === 'reference';
    const id =
      !this.selected || index == null || Number.isNaN(index)
        ? 'know-sec-top'
        : sectionDomId(this.selected.id, index);
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
      if (isPowerPart(systemId)) {
        this.openPower(systemId, null);
        return;
      }
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
