import { Component } from '@angular/core';
import { ContentService } from '../../core/services/content.service';
import { EmergencyService } from '../../core/services/emergency.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import { FixCard } from '../../core/models/bootstrap-content.model';

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
export class FixPage {
  query = '';
  categoryFilter = 'all';
  expandedIndex: number | null = null;
  readonly categories = FIX_CATEGORIES;

  constructor(
    public readonly content: ContentService,
    private readonly emergency: EmergencyService,
    private readonly routes: VesselRouteService,
  ) {}

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

    if (!q) {
      return fixes;
    }

    return fixes.filter(
      (fix) =>
        fix.title.toLowerCase().includes(q) ||
        fix.catL.toLowerCase().includes(q) ||
        fix.steps.some((step) => step.toLowerCase().includes(q)),
    );
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
    void this.routes.navigateTabs('ask');
  }

  openEmergency(): void {
    this.emergency.requestOpen();
  }
}
