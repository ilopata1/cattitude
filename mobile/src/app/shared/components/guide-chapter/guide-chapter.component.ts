import { Component, EventEmitter, Input, Output } from '@angular/core';
import { DomSanitizer, SafeHtml } from '@angular/platform-browser';
import {
  ChapterPresentation,
  presentChapter,
} from '../../../core/guide/chapter-presentation';
import {
  isPowerPart,
  PowerPresentation,
  presentPower,
} from '../../../core/guide/power-topic';
import {
  LearnCheck,
  SystemModule,
  SystemSection,
} from '../../../core/models/bootstrap-content.model';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';

export interface ChapterCheckRow {
  system: SystemModule;
  check: string | LearnCheck | null;
  text: string;
}

@Component({
  selector: 'app-guide-chapter',
  templateUrl: './guide-chapter.component.html',
  styleUrls: ['./guide-chapter.component.scss'],
  standalone: false,
})
export class GuideChapterComponent {
  @Input() mode: 'chapter' | 'power' = 'chapter';
  @Input() system: SystemModule | null = null;
  @Input() showFixes = false;
  @Input() showChecks = false;
  @Output() systemLink = new EventEmitter<string>();

  private presentedSystem: SystemModule | null = null;
  private presentedFixes: ReturnType<ContentService['getFixes']> | null = null;
  private presented: ChapterPresentation<SystemSection> | null = null;
  private powerMembers: SystemModule[] | null = null;
  private powerGalley: SystemModule | null = null;
  private powerFixes: ReturnType<ContentService['getFixes']> | null = null;
  private powerCached: PowerPresentation<SystemSection> | null = null;

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly vesselRoutes: VesselRouteService,
    private readonly sanitizer: DomSanitizer,
  ) {}

  chapter(): ChapterPresentation<SystemSection> | null {
    const system = this.system;
    if (!system || this.mode !== 'chapter') {
      return null;
    }
    const fixes = this.content.getFixes();
    if (this.presented && this.presentedSystem === system && this.presentedFixes === fixes) {
      return this.presented;
    }
    this.presentedSystem = system;
    this.presentedFixes = fixes;
    this.presented = presentChapter(system, fixes);
    return this.presented;
  }

  power(): PowerPresentation<SystemSection> | null {
    if (this.mode !== 'power') {
      return null;
    }
    const members = this.content.getSystemsOrdered().filter((system) => isPowerPart(system.id));
    if (!members.length) {
      return null;
    }
    const fixes = this.content.getFixes();
    const galley = this.content.getSystem('galley') ?? null;
    const sameMembers =
      !!this.powerMembers &&
      this.powerMembers.length === members.length &&
      this.powerMembers.every((system, index) => system === members[index]);
    if (sameMembers && this.powerFixes === fixes && this.powerGalley === galley && this.powerCached) {
      return this.powerCached;
    }
    this.powerMembers = members;
    this.powerFixes = fixes;
    this.powerGalley = galley;
    this.powerCached = presentPower(members, fixes, galley);
    return this.powerCached;
  }

  checkRows(): ChapterCheckRow[] {
    if (!this.showChecks) {
      return [];
    }
    const systems =
      this.mode === 'power'
        ? this.content.getSystemsOrdered().filter((system) => isPowerPart(system.id))
        : this.system
          ? [this.system]
          : [];
    const rows: ChapterCheckRow[] = [];
    for (const system of systems) {
      const checks = system.learnChecks ?? [];
      if (!checks.length) {
        rows.push({ system, check: null, text: "I've reviewed this" });
        continue;
      }
      for (const check of checks) {
        rows.push({
          system,
          check,
          text: typeof check === 'string' ? check : check.text,
        });
      }
    }
    return rows;
  }

  isRowDone(row: ChapterCheckRow): boolean {
    if (row.check === null) {
      return this.progress.isSystemDone(row.system);
    }
    return this.progress.isCheckDone(row.system, row.check);
  }

  toggleRow(row: ChapterCheckRow): void {
    if (row.check === null) {
      this.progress.toggleSystem(row.system);
      return;
    }
    this.progress.toggleCheck(row.system, row.check);
  }

  openFixCard(slug: string): void {
    void this.vesselRoutes.navigateTabsWithExtras(['fix'], {
      queryParams: { card: slug, cat: null },
    });
  }

  openLearn(token: string): void {
    void this.navigateGuideLink(token);
  }

  trustedGuideHtml(html: string | undefined): SafeHtml {
    return this.sanitizer.bypassSecurityTrustHtml(this.normalizeGuideHtml(html || ''));
  }

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
    if (!(target instanceof Element) || !target.closest('[data-guide-link]')) {
      return;
    }
    event.preventDefault();
    this.onGuideHtmlClick(event);
  }

  sectionItems(section: SystemSection): string[] {
    const items = section.items;
    if (!Array.isArray(items)) {
      return [];
    }
    return items
      .map((item) => this.itemLabel(item))
      .filter((label): label is string => !!label);
  }

  sectionLocationRows(section: SystemSection): Array<{ name: string; location: string }> {
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
        const location = String((row as { location?: unknown }).location || '').trim();
        if (!location) {
          return null;
        }
        return { name, location };
      })
      .filter((row): row is { name: string; location: string } => !!row);
  }

  private itemLabel(item: unknown): string {
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

  private async navigateGuideLink(token: string): Promise<void> {
    if (!token) {
      return;
    }
    if (token.startsWith('system:')) {
      this.systemLink.emit(token.slice('system:'.length));
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
}
