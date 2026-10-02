import { Component, DestroyRef, inject, signal } from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import {
  DashboardGroup,
  DashboardItem,
  buildDashboardCatalog,
  layoutIds,
  resolveDashboard,
  visibleItems,
} from '../../core/guide/dashboard';
import { resolveLearnPath } from '../../core/guide/learn-path';
import { EMPTY_SAIL_ESSENTIALS, EMPTY_WIND_STEER } from '../../core/models/instrument-map.model';
import { PolarWindowAverages, PolarWindowMinutes, PolarWindowSet } from '../../core/models/polar.model';
import { ContentService } from '../../core/services/content.service';
import { DashboardLayoutService } from '../../core/services/dashboard-layout.service';
import { InstrumentLiveService } from '../../core/services/instrument-live.service';
import { PolarService } from '../../core/services/polar.service';
import { ReaderViewService } from '../../core/services/reader-view.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { VesselContextService } from '../../core/services/vessel-context.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

const GROUP_LABELS: Record<DashboardGroup, string> = {
  do: 'Do',
  know: 'Know',
  fix: 'Fix',
  more: 'More',
  widgets: 'Widgets',
};

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  editing = false;
  addOpen = false;

  readonly content = inject(ContentService);
  readonly readerView = inject(ReaderViewService);

  private readonly destroyRef = inject(DestroyRef);
  private readonly live = inject(InstrumentLiveService);
  private readonly polar = inject(PolarService);
  private readonly layouts = inject(DashboardLayoutService);
  private readonly routes = inject(VesselRouteService);
  private readonly vesselContext = inject(VesselContextService);
  private readonly skSettings = inject(SignalKSettingsService);
  private readonly signalKOn = signal(false);

  readonly essentials = toSignal(this.live.essentials$, { initialValue: EMPTY_SAIL_ESSENTIALS });
  readonly wind = toSignal(this.live.wind$, { initialValue: EMPTY_WIND_STEER });
  readonly polarWindows = toSignal(this.polar.windows$, { initialValue: EMPTY_POLAR_WINDOWS });

  constructor() {
    this.skSettings.url$.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((url) => {
      this.signalKOn.set(!!url.trim());
    });
  }

  tiles(): DashboardItem[] {
    const view = this.readerView.view();
    const catalog = this.catalog();
    const ids = layoutIds(
      this.layouts.saved(this.vesselContext.vesselSlug, view),
      view,
      catalog,
      this.signalKOn(),
    );
    return resolveDashboard(ids, catalog, view);
  }

  addGroups(): Array<{ label: string; topics: DashboardItem[] }> {
    const view = this.readerView.view();
    const available = visibleItems(this.catalog(), view);
    const groups: DashboardGroup[] = ['do', 'know', 'fix', 'more', 'widgets'];
    return groups
      .map((group) => ({
        label: GROUP_LABELS[group],
        topics: available.filter((item) => item.group === group && !item.parentId),
      }))
      .filter((group) => group.topics.length > 0);
  }

  children(parent: DashboardItem): DashboardItem[] {
    return visibleItems(this.catalog(), this.readerView.view()).filter((item) => item.parentId === parent.id);
  }

  placed(item: DashboardItem): boolean {
    return this.tiles().some((tile) => tile.id === item.id);
  }

  toggleEdit(): void {
    this.editing = !this.editing;
    if (!this.editing) {
      this.addOpen = false;
    }
  }

  add(item: DashboardItem): void {
    if (this.placed(item)) {
      return;
    }
    this.persist([...this.tiles().map((tile) => tile.id), item.id]);
  }

  remove(item: DashboardItem): void {
    this.persist(this.tiles().filter((tile) => tile.id !== item.id).map((tile) => tile.id));
  }

  reset(): void {
    this.layouts.reset(this.vesselContext.vesselSlug, this.readerView.view());
  }

  reorder(event: Event): void {
    const detail = (event as CustomEvent<{
      complete: (data?: DashboardItem[]) => DashboardItem[];
    }>).detail;
    const next = detail.complete(this.tiles().slice());
    this.persist(next.map((item) => item.id));
  }

  open(item: DashboardItem): void {
    if (this.editing) {
      return;
    }
    if (item.id === 'widget:polar') {
      void this.routes.navigateTabs('more', 'polar');
      return;
    }
    if (item.kind === 'widget' && item.id !== 'widget:rules') {
      this.openLive();
      return;
    }
    void this.routes.navigateTabsWithExtras(item.segments, item.query ? { queryParams: item.query } : undefined);
  }

  reading(id: string): string | null {
    const wind = this.wind();
    switch (id) {
      case 'widget:depth':
        return this.depthLabel();
      case 'widget:speed':
        return this.speedLabel();
      case 'widget:aws':
        return freshKnots(wind.aws, wind.awsFresh);
      case 'widget:tws':
        return freshKnots(wind.tws, wind.twsFresh);
      case 'widget:awa':
        return freshDegrees(wind.awa, wind.awaFresh);
      case 'widget:heading':
        return freshDegrees(wind.heading, wind.headingFresh);
      case 'widget:cog':
        return freshDegrees(wind.cog, wind.cogFresh);
      case 'widget:sog': {
        const sog = this.essentials().sogKnots;
        return sog === null ? '—' : `${sog.toFixed(1)} kn`;
      }
      default:
        return null;
    }
  }

  polarRows(): Array<{ minutes: PolarWindowMinutes; pct: string }> {
    const windows = this.polarWindows();
    return ([5, 10, 15] as const).map((minutes) => {
      const pct = windows[minutes].polarPct;
      return { minutes, pct: pct === null ? '—' : `${pct.toFixed(0)}%` };
    });
  }

  depthLabel(): string {
    const depth = this.essentials().depthM;
    return depth === null ? '—' : `${depth.toFixed(1)} m`;
  }

  speedLabel(): string {
    const live = this.essentials();
    if (live.speedKn === null) {
      return '—';
    }
    const source = live.speedSource === 'sog' ? 'SOG' : live.speedSource === 'stw' ? 'STW' : '';
    return source ? `${live.speedKn.toFixed(1)} kn ${source}` : `${live.speedKn.toFixed(1)} kn`;
  }

  windSpeedLabel(): string {
    const wind = this.wind();
    if (wind.twsFresh) {
      return `${wind.tws.toFixed(1)} kn`;
    }
    if (wind.awsFresh) {
      return `${wind.aws.toFixed(1)} kn`;
    }
    return '—';
  }

  windDetailLabel(): string {
    const wind = this.wind();
    if (wind.twsFresh || wind.twaFresh) {
      return windParts('TWS', wind.twsFresh, 'TWA', wind.twaFresh ? wind.twa : null);
    }
    if (wind.awsFresh || wind.awaFresh) {
      return windParts('AWS', wind.awsFresh, 'AWA', wind.awaFresh ? wind.awa : null);
    }
    return '';
  }

  liveConfigured(): boolean {
    return this.signalKOn();
  }

  liveStale(): boolean {
    return this.essentials().stale;
  }

  private openLive(): void {
    if (this.signalKOn()) {
      void this.routes.navigateTabs('more', 'sail');
      return;
    }
    void this.routes.navigateTabs('more', 'settings');
  }

  private persist(ids: string[]): void {
    this.layouts.save(this.vesselContext.vesselSlug, this.readerView.view(), ids);
  }

  private catalog(): DashboardItem[] {
    const ui = this.content.bootstrap.ui;
    const learn = resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    );
    return buildDashboardCatalog({
      vesselType: this.content.bootstrap.branding.vesselType,
      systems: this.content.getSystemsOrdered().map((system) => ({
        id: system.id,
        title: system.title,
        icon: system.icon,
        subtitle: system.subtitle,
        sections: system.sections,
      })),
      doMenu: ui.doMenu,
      learnAvailable: learn.length > 0,
      rulesAvailable: (ui.homeRuleSections ?? []).some((section) => section.rules?.length),
    });
  }
}

const EMPTY_POLAR_WINDOW: PolarWindowAverages = {
  twaDeg: null,
  twsKnots: null,
  polarPct: null,
  sampleCount: 0,
};

const EMPTY_POLAR_WINDOWS: PolarWindowSet = {
  5: EMPTY_POLAR_WINDOW,
  10: EMPTY_POLAR_WINDOW,
  15: EMPTY_POLAR_WINDOW,
};

function freshKnots(knots: number, fresh: boolean): string {
  return fresh ? `${knots.toFixed(1)} kn` : '—';
}

function freshDegrees(degrees: number, fresh: boolean): string {
  return fresh ? `${Math.round(degrees)}°` : '—';
}

function windParts(speedName: string, speedFresh: boolean, angleName: string, angle: number | null): string {
  const parts: string[] = [];
  if (speedFresh) {
    parts.push(speedName);
  }
  if (angle !== null) {
    parts.push(`${angleName} ${Math.round(angle)}°`);
  }
  return parts.join(' · ');
}
