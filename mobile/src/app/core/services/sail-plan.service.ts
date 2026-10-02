import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { ensureMainSail } from '../guide/current-sail';
import { SailAdvice, SailPlan, cloneCell } from '../models/sail-plan.model';
import { ContentService } from './content.service';
import { adviseSailPlan, resizeCells, resizeHeavyWeatherCells } from './sail-plan-advisor';
import { VesselContextService } from './vessel-context.service';

const STORAGE_KEY = 'cattitude.sailPlan.v1';

interface SailPlanResponse {
  vesselId?: string;
  vesselSlug?: string;
  plan: SailPlan | null;
  updatedAt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class SailPlanService {

  private readonly planSubject: BehaviorSubject<SailPlan>;
  readonly plan$: Observable<SailPlan>;

  private hydratePromise: Promise<void> | null = null;
  private hydrateSlug: string | null = null;
  /** True once a saved plan (this device or the server) is the active plan. */
  private usingStored = false;

  constructor(
    private readonly http: HttpClient,
    private readonly vesselContext: VesselContextService,
    private readonly content: ContentService,
  ) {
    const cached = this.readCache(this.vesselContext.vesselSlug);
    this.usingStored = cached != null;
    const initial = cached ?? blankSailPlan('Sail plan');
    this.planSubject = new BehaviorSubject<SailPlan>(initial);
    this.plan$ = this.planSubject.asObservable();
  }

  get plan(): SailPlan {
    return this.planSubject.value;
  }

  advise(twaDeg: number | null, twsKnots: number | null, polarPct: number | null): SailAdvice | null {
    return adviseSailPlan(this.plan, twaDeg, twsKnots, polarPct);
  }

  /** Load the vessel's plan from the API (once per slug). Safe to call from APP_INITIALIZER. */
  ensureLoaded(): Promise<void> {
    const slug = this.vesselContext.vesselSlug;
    if (this.hydratePromise && this.hydrateSlug === slug) return this.hydratePromise;
    this.hydrateSlug = slug;
    this.hydratePromise = this.hydrate(slug).catch(() => {
      this.hydratePromise = null;
      this.hydrateSlug = null;
    });
    return this.hydratePromise;
  }

  async save(plan: SailPlan): Promise<boolean> {
    const slug = this.vesselContext.vesselSlug;
    const next = sanitizePlan(plan);
    this.usingStored = true;
    this.apply(next, slug);
    try {
      await this.push(next, slug);
      return true;
    } catch {
      return false;
    }
  }

  /** Published reset target, once the guide is loaded and includes one. */
  publishedTemplate(): SailPlan | null {
    if (!this.content.loaded) {
      return null;
    }
    const plan = this.content.bootstrap.ui.sailPlanTemplate;
    if (!plan || !Array.isArray(plan.sails) || !Array.isArray(plan.twaCuts)) {
      return null;
    }
    return sanitizePlan(plan);
  }

  /**
   * Use the published template when this vessel has no saved plan yet.
   * Safe to call after the guide loads; a saved plan is left alone.
   */
  adoptPublishedTemplate(): void {
    if (this.usingStored) {
      return;
    }
    this.applyFallback(this.vesselContext.vesselSlug);
  }

  async resetToTemplate(): Promise<boolean> {
    const template = this.publishedTemplate();
    if (!template) {
      return false;
    }
    this.usingStored = true;
    return this.save(structuredClone(template));
  }

  private async hydrate(slug: string): Promise<void> {
    const cached = this.readCache(slug);
    this.usingStored = cached != null;
    try {
      const res = await firstValueFrom(this.http.get<SailPlanResponse>(this.url(slug)));
      if (res.plan) {
        this.usingStored = true;
        this.apply(sanitizePlan(res.plan), slug);
        return;
      }
      if (cached) {
        this.usingStored = true;
        await this.push(cached, slug);
        return;
      }
    } catch {
      if (cached) {
        this.usingStored = true;
        this.apply(cached, slug, false);
        return;
      }
    }
    this.usingStored = false;
    this.applyFallback(slug);
  }

  private applyFallback(slug: string): void {
    if (this.usingStored) {
      return;
    }
    const template = this.publishedTemplate();
    const next = template ?? blankSailPlan(this.planNameFromGuide());
    this.apply(next, slug, false);
  }

  private planNameFromGuide(): string {
    if (!this.content.loaded) {
      return 'Sail plan';
    }
    const branding = this.content.bootstrap.branding;
    return (branding.model || branding.vesselName || 'Sail plan').trim() || 'Sail plan';
  }

  private async push(plan: SailPlan, slug: string): Promise<void> {
    const res = await firstValueFrom(this.http.post<SailPlanResponse>(this.url(slug), plan));
    if (res.plan) this.apply(sanitizePlan(res.plan), slug);
  }

  private apply(plan: SailPlan, slug: string, persistCache = true): void {
    this.planSubject.next(plan);
    if (persistCache) this.writeCache(slug, plan);
  }

  private url(slug: string): string {
    return `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(slug)}/sail-plan`;
  }

  private cacheKey(slug: string): string {
    return `${STORAGE_KEY}:${slug}`;
  }

  private readCache(slug: string): SailPlan | null {
    try {
      const raw = localStorage.getItem(this.cacheKey(slug));
      if (raw) return sanitizePlan(JSON.parse(raw) as SailPlan);
    } catch { /* ignore */ }
    return null;
  }

  private writeCache(slug: string, plan: SailPlan): void {
    try {
      localStorage.setItem(this.cacheKey(slug), JSON.stringify(plan));
    } catch { /* ignore quota */ }
  }
}

function sanitizePlan(input: SailPlan): SailPlan {
  const twaCuts = normalizeCuts(input.twaCuts, 0, 180, [0, 180]);
  const twsCuts = normalizeCuts(input.twsCuts, 0, 80, [0, 30]);
  const cells = resizeCells(
    input.twaCuts ?? twaCuts,
    input.twsCuts ?? twsCuts,
    input.cells ?? [],
    twaCuts,
    twsCuts,
  );

  const hwCuts = normalizeCuts(input.heavyWeather?.twaCuts, 0, 180, [0, 180]);
  const hwCells = resizeHeavyWeatherCells(
    input.heavyWeather?.twaCuts ?? hwCuts,
    input.heavyWeather?.cells ?? [],
    hwCuts,
  );

  return {
    name: (input.name ?? '').trim() || 'Sail plan',
    sails: ensureMainSail((input.sails ?? []).map(s => s.trim()).filter(Boolean)),
    twaCuts,
    twsCuts,
    cells,
    heavyWeather: {
      enabled: input.heavyWeather?.enabled ?? false,
      twsFrom: clampNum(input.heavyWeather?.twsFrom ?? twsCuts[twsCuts.length - 1], 0, 80),
      twaCuts: hwCuts,
      cells: hwCells,
    },
    notes: input.notes ?? '',
  };
}

function normalizeCuts(cuts: number[] | undefined, min: number, max: number, fallback: number[]): number[] {
  const values = [...new Set((cuts ?? []).map(n => clampNum(n, min, max)))]
    .filter(n => Number.isFinite(n))
    .sort((a, b) => a - b);
  if (values.length < 2) return [...fallback];
  return values;
}

function clampNum(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function blankSailPlan(name: string): SailPlan {
  return {
    name: name.trim() || 'Sail plan',
    sails: ['Main'],
    twaCuts: [0, 180],
    twsCuts: [0, 30],
    cells: [[{ primary: 'Main', alternatives: [] }]],
    heavyWeather: {
      enabled: false,
      twsFrom: 30,
      twaCuts: [0, 180],
      cells: [{ primary: '', alternatives: [] }],
    },
    notes: '',
  };
}

export function clonePlan(plan: SailPlan): SailPlan {
  return {
    name: plan.name,
    sails: [...plan.sails],
    twaCuts: [...plan.twaCuts],
    twsCuts: [...plan.twsCuts],
    cells: plan.cells.map(row => row.map(c => cloneCell(c))),
    heavyWeather: {
      enabled: plan.heavyWeather.enabled,
      twsFrom: plan.heavyWeather.twsFrom,
      twaCuts: [...plan.heavyWeather.twaCuts],
      cells: plan.heavyWeather.cells.map(c => cloneCell(c)),
    },
    notes: plan.notes,
  };
}
