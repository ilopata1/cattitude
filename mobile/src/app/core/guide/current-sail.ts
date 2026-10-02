import { SailPlan } from '../models/sail-plan.model';

/** Mainsail choices on Polar. "Full" is an unreefed main. */
export const MAIN_REEF_OPTIONS = ['Full', '1 reef', '2 reefs', '3 reefs'] as const;

export type MainReef = (typeof MAIN_REEF_OPTIONS)[number];

export interface CurrentSailSelection {
  main: MainReef | '';
  headsail: string;
}

export const EMPTY_CURRENT_SAILS: CurrentSailSelection = { main: '', headsail: '' };

const REEF_LABEL: Record<number, MainReef> = {
  1: '1 reef',
  2: '2 reefs',
  3: '3 reefs',
};

/** Inventory sails other than the main. Advice sentences are not sails. */
export function headsailOptions(plan: SailPlan): string[] {
  const options: string[] = [];
  const seen = new Set<string>();
  for (const sail of plan.sails ?? []) {
    const text = (sail || '').trim();
    const key = normalizeSailConfiguration(text);
    if (!key || isMainSail(text) || seen.has(key)) {
      continue;
    }
    seen.add(key);
    options.push(text);
  }
  return options;
}

export function isMainSail(name: string | null | undefined): boolean {
  return normalizeSailConfiguration(name) === 'main';
}

export function isMainReef(value: string | null | undefined): value is MainReef {
  return (MAIN_REEF_OPTIONS as readonly string[]).includes((value || '').trim());
}

/** Main is always the first sail. A plan that omitted it gets one. */
export function ensureMainSail(sails: string[]): string[] {
  const cleaned = sails.map((sail) => sail.trim()).filter(Boolean);
  const main = cleaned.find((sail) => isMainSail(sail)) ?? 'Main';
  return [main, ...cleaned.filter((sail) => !isMainSail(sail))];
}

export function formatCurrentSails(selection: CurrentSailSelection): string {
  return [selection.main, selection.headsail].filter(Boolean).join(' + ');
}

export function normalizeSailConfiguration(value: string | null | undefined): string {
  return (value || '').trim().toLowerCase().replace(/\s+/g, ' ');
}

/**
 * True when a sail the crew selected disagrees with the 15-minute recommendation.
 * Advice that does not name a main or a headsail (for example "do not press
 * dead downwind") is not a sail configuration, so it does not alert.
 * A dropdown the crew has not set yet is left out of the comparison.
 */
export function sailPlansDiffer(
  current: CurrentSailSelection,
  recommended: string | null | undefined,
  plan: SailPlan,
): boolean {
  const parsed = parseRecommendedSails(recommended, plan);
  if (!parsed) {
    return false;
  }
  if (current.main && parsed.mains.length > 0 && !parsed.mains.includes(current.main)) {
    return true;
  }
  if (current.headsail && parsed.headsails.length > 0 && !headsailAllowed(current.headsail, parsed.headsails)) {
    return true;
  }
  return false;
}

interface ParsedRecommendation {
  mains: MainReef[];
  headsails: string[];
}

function parseRecommendedSails(recommended: string | null | undefined, plan: SailPlan): ParsedRecommendation | null {
  const text = normalizeSailConfiguration(recommended);
  if (!text) {
    return null;
  }
  const mains = parseMains(text);
  const headsails = matchHeadsails(text, headsailOptions(plan));
  if (/\bmain[\s-]*only\b/.test(text)) {
    headsails.unshift('');
  }
  if (!mains.length && !headsails.length) {
    return null;
  }
  return { mains, headsails };
}

function parseMains(text: string): MainReef[] {
  const range = text.match(/(\d)\s*[-–—]\s*(\d)\s*reefs?\b/);
  if (range) {
    return reefsBetween(Number(range[1]), Number(range[2]));
  }
  const single = text.match(/(\d)\s*reefs?\b/);
  if (single) {
    const label = REEF_LABEL[Number(single[1])];
    return label ? [label] : [];
  }
  if (/\breefed\b/.test(text)) {
    return ['1 reef', '2 reefs', '3 reefs'];
  }
  if (/\bmain\b/.test(text)) {
    return ['Full'];
  }
  return [];
}

function reefsBetween(from: number, to: number): MainReef[] {
  const low = Math.min(from, to);
  const high = Math.max(from, to);
  const reefs: MainReef[] = [];
  for (let count = low; count <= high; count += 1) {
    const label = REEF_LABEL[count];
    if (label) {
      reefs.push(label);
    }
  }
  return reefs;
}

function matchHeadsails(text: string, options: string[]): string[] {
  const named = options.filter((sail) => text.includes(normalizeSailConfiguration(sail)));
  if (named.length) {
    return named;
  }
  const words = new Set(
    text.split(/[^a-z0-9]+/).filter((word) => word.length >= 2 && !HEADSAIL_STOP_WORDS.has(word)),
  );
  return options.filter((sail) =>
    normalizeSailConfiguration(sail)
      .split(' ')
      .some((word) => words.has(word)),
  );
}

const HEADSAIL_STOP_WORDS = new Set(['main', 'reef', 'reefs', 'reefed', 'only', 'small', 'the', 'and', 'or']);

function headsailAllowed(selected: string, allowed: string[]): boolean {
  const key = normalizeSailConfiguration(selected);
  return allowed.some((sail) => sail !== '' && normalizeSailConfiguration(sail) === key);
}
