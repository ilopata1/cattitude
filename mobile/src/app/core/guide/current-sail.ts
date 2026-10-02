import { SailPlan } from '../models/sail-plan.model';

/** Known configurations: the inventory, then each sail-plan recommendation. */
export function sailConfigurationOptions(plan: SailPlan): string[] {
  const options: string[] = [];
  const seen = new Set<string>();
  const add = (value: string | undefined) => {
    const text = (value || '').trim();
    const key = normalizeSailConfiguration(text);
    if (!key || seen.has(key)) {
      return;
    }
    seen.add(key);
    options.push(text);
  };
  for (const sail of plan.sails ?? []) {
    add(sail);
  }
  for (const row of plan.cells ?? []) {
    for (const cell of row ?? []) {
      add(cell?.primary);
    }
  }
  for (const cell of plan.heavyWeather?.cells ?? []) {
    add(cell?.primary);
  }
  return options;
}

export function normalizeSailConfiguration(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/** True when both sides are filled in and they are not the same configuration. */
export function sailPlansDiffer(current: string | null | undefined, recommended: string | null | undefined): boolean {
  const entered = normalizeSailConfiguration(current);
  const suggested = normalizeSailConfiguration(recommended);
  return !!entered && !!suggested && entered !== suggested;
}
