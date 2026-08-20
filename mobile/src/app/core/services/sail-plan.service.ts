import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SailAdvice, SailPlan, cloneCell } from '../models/sail-plan.model';
import { adviseSailPlan, resizeCells, resizeHeavyWeatherCells } from './sail-plan-advisor';
import { DEFAULT_SAIL_PLAN } from './sail-plan-default';
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

  constructor(
    private readonly http: HttpClient,
    private readonly vesselContext: VesselContextService,
  ) {
    const initial = this.readCache(this.vesselContext.vesselSlug) ?? structuredClone(DEFAULT_SAIL_PLAN);
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
    this.apply(next, slug);
    try {
      await this.push(next, slug);
      return true;
    } catch {
      return false;
    }
  }

  async resetToTemplate(): Promise<boolean> {
    return this.save(structuredClone(DEFAULT_SAIL_PLAN));
  }

  private async hydrate(slug: string): Promise<void> {
    const cached = this.readCache(slug);
    try {
      const res = await firstValueFrom(this.http.get<SailPlanResponse>(this.url(slug)));
      if (res.plan) {
        this.apply(sanitizePlan(res.plan), slug);
        return;
      }
      if (cached) {
        await this.push(cached, slug);
      }
    } catch {
      if (cached) this.apply(cached, slug, false);
    }
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
      if (slug === environment.defaultVesselSlug) {
        const legacy = localStorage.getItem(STORAGE_KEY);
        if (legacy) return sanitizePlan(JSON.parse(legacy) as SailPlan);
      }
    } catch { /* ignore */ }
    return null;
  }

  private writeCache(slug: string, plan: SailPlan): void {
    try {
      const raw = JSON.stringify(plan);
      localStorage.setItem(this.cacheKey(slug), raw);
      if (slug === environment.defaultVesselSlug) {
        localStorage.setItem(STORAGE_KEY, raw);
      }
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
    sails: (input.sails ?? []).map(s => s.trim()).filter(Boolean),
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
