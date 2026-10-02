import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { ContentService } from '../../core/services/content.service';
import { EmergencyService } from '../../core/services/emergency.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import { FixCard } from '../../core/models/bootstrap-content.model';
import { fixCardSlugs } from '../../core/search/guide-search';
import { scrollToElement } from '../../core/search/scroll-into-content';

const FIX_CATEGORIES = [
  { key: 'all', label: 'All' },
  { key: 'engine', label: 'Engine' },
  { key: 'electrical', label: 'Electrical' },
  { key: 'plumbing', label: 'Plumbing' },
  { key: 'sails', label: 'Sails' },
  { key: 'nav', label: 'Navigation' },
  { key: 'general', label: 'General' },
] as const;

const CATEGORY_CLASSES: Record<string, string> = {
  engine: 'cat-engine',
  electrical: 'cat-electrical',
  plumbing: 'cat-plumbing',
  sails: 'cat-sails',
  nav: 'cat-nav',
  general: 'cat-general',
};

@Component({
  selector: 'app-fix',
  templateUrl: './fix.page.html',
  styleUrls: ['./fix.page.scss'],
  standalone: false,
})
export class FixPage implements OnInit {
  query = '';
  categoryFilter = 'all';
  expandedIndex: number | null = null;
  readonly categories = FIX_CATEGORIES;

  @ViewChild(IonContent) private ionContent?: IonContent;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    private readonly emergency: EmergencyService,
    private readonly routes: VesselRouteService,
    private readonly route: ActivatedRoute,
  ) {}

  ngOnInit(): void {
    // Ionic keeps tab pages alive — re-apply category deep-links from Know.
    this.route.queryParamMap
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((params) => {
        const card = (params.get('card') || '').trim();
        if (card) {
          this.openCard(card);
          return;
        }
        const cat = (params.get('cat') || '').trim().toLowerCase();
        if (cat && this.categories.some((c) => c.key === cat)) {
          this.categoryFilter = cat;
          this.expandedIndex = null;
        }
      });
  }

  private openCard(slug: string): void {
    this.query = '';
    this.categoryFilter = 'all';
    const fixes = this.content.getFixes();
    const index = fixCardSlugs(fixes.map((fix) => fix.title)).indexOf(slug);
    const found = index >= 0 ? fixes[index] : undefined;
    const shown = found ? this.filteredFixes().indexOf(found) : -1;
    this.expandedIndex = shown >= 0 ? shown : null;
    if (this.expandedIndex != null) {
      scrollToElement(this.ionContent, `fix-card-${this.expandedIndex}`);
    }
  }

  get charterCompany(): string {
    return this.content.bootstrap.branding.charterCompany?.trim() ?? '';
  }

  get isCharterVessel(): boolean {
    return !!this.charterCompany;
  }

  filteredFixes(): FixCard[] {
    const q = this.query.trim().toLowerCase();
    let fixes = this.content.getFixes();

    if (this.categoryFilter !== 'all') {
      fixes = fixes.filter((fix) => fix.cat === this.categoryFilter);
    }

    if (q) {
      fixes = fixes.filter(
        (fix) =>
          fix.title.toLowerCase().includes(q) ||
          fix.catL.toLowerCase().includes(q) ||
          fix.steps.some((step) => step.toLowerCase().includes(q)),
      );
    }

    // When viewing all categories, group cards in chip order.
    if (this.categoryFilter === 'all') {
      const order = new Map<string, number>(
        FIX_CATEGORIES.filter((c) => c.key !== 'all').map((c, i) => [c.key, i]),
      );
      fixes = [...fixes].sort((a, b) => {
        const byCat =
          (order.get(a.cat) ?? Number.MAX_SAFE_INTEGER) -
          (order.get(b.cat) ?? Number.MAX_SAFE_INTEGER);
        if (byCat !== 0) {
          return byCat;
        }
        return a.title.localeCompare(b.title);
      });
    }

    return fixes;
  }

  setCategory(key: string): void {
    this.categoryFilter = key;
    this.expandedIndex = null;
  }

  toggle(index: number): void {
    this.expandedIndex = this.expandedIndex === index ? null : index;
  }

  isHtmlStep(step: string): boolean {
    return /^\s*</.test(step);
  }

  categoryClass(cat: string): string {
    return CATEGORY_CLASSES[cat] || 'cat-general';
  }

  openAsk(): void {
    void this.routes.navigateTabs('more', 'ask');
  }

  openEmergency(): void {
    this.emergency.requestOpen();
  }
}
