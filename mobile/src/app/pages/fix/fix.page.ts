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

/** Material / LLM icon names → emoji for plain-text Fix It rendering. */
const FIX_ICON_NAME_MAP: Record<string, string> = {
  warning: '⚠️',
  warning_amber: '⚠️',
  error: '🔴',
  error_outline: '🔴',
  battery_alert: '🪫',
  battery_full: '🔋',
  battery_charging_full: '🔋',
  battery_std: '🔋',
  thermostat: '⚠️',
  device_thermostat: '⚠️',
  water_drop: '💧',
  bolt: '⚡',
  electrical_services: '⚡',
  build: '🔧',
  handyman: '🔧',
  anchor: '⚓',
  sailing: '⛵',
  directions_boat: '🚤',
  ac_unit: '❄️',
  kitchen: '🧊',
  radio: '📻',
  explore: '🧭',
  navigation: '🧭',
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

  /** Display emoji even when guide payload stored a Material-style icon name. */
  displayIcon(icon: string | undefined): string {
    const raw = (icon ?? '').trim();
    if (!raw) {
      return '🔧';
    }
    if ([...raw].some((ch) => ch.codePointAt(0)! > 127)) {
      // Thermometer emoji is poorly supported on some Windows fonts.
      if (raw.startsWith('🌡')) {
        return '⚠️';
      }
      return raw;
    }
    const key = raw.toLowerCase().replace(/[-\s]/g, '_');
    if (FIX_ICON_NAME_MAP[key]) {
      return FIX_ICON_NAME_MAP[key];
    }
    const snake = raw.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
    if (FIX_ICON_NAME_MAP[snake]) {
      return FIX_ICON_NAME_MAP[snake];
    }
    if (/^[A-Za-z0-9_-]+$/.test(raw)) {
      return '🔧';
    }
    return raw;
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
