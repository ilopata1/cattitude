import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { SailAdvice, SailPlan, cloneCell } from '../models/sail-plan.model';
import { adviseSailPlan, resizeCells, resizeHeavyWeatherCells } from './sail-plan-advisor';
import { DEFAULT_SAIL_PLAN } from './sail-plan-default';

const STORAGE_KEY = 'cattitude.sailPlan.v1';

@Injectable({ providedIn: 'root' })
export class SailPlanService {

  private readonly planSubject = new BehaviorSubject<SailPlan>(this.load());
  readonly plan$ = this.planSubject.asObservable();

  get plan(): SailPlan {
    return this.planSubject.value;
  }

  advise(twaDeg: number | null, twsKnots: number | null, polarPct: number | null): SailAdvice | null {
    return adviseSailPlan(this.plan, twaDeg, twsKnots, polarPct);
  }

  save(plan: SailPlan): void {
    const next = sanitizePlan(plan);
    this.planSubject.next(next);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    } catch { /* ignore quota */ }
  }

  resetToTemplate(): void {
    this.save(structuredClone(DEFAULT_SAIL_PLAN));
  }

  private load(): SailPlan {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) return sanitizePlan(JSON.parse(raw) as SailPlan);
    } catch { /* ignore */ }
    return structuredClone(DEFAULT_SAIL_PLAN);
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
