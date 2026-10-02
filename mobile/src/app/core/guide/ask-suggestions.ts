/**
 * Ask suggestion chips from a vessel's published system chapters.
 * Same rules as backend/guide_ask.py.
 */

export interface AskSuggestionSystem {
  title?: string;
}

const ORDER = [
  'engines',
  'electrical',
  'water',
  'sails',
  'nav',
  'batteries',
  'anchoring',
  'galley',
  'heads',
  'dinghy',
  'ac',
  'controls',
] as const;

const FALLBACK: Record<(typeof ORDER)[number], string> = {
  engines: 'engine',
  electrical: 'electrical panel',
  water: 'water system',
  sails: 'sails',
  nav: 'navigation instruments',
  batteries: 'batteries',
  anchoring: 'windlass',
  galley: 'galley',
  heads: 'heads',
  dinghy: 'tender',
  ac: 'air conditioning',
  controls: 'switching panel',
};

const PATTERN: Record<(typeof ORDER)[number], string> = {
  engines: 'How do I start the {name}?',
  electrical: 'Where is the {name}?',
  water: 'How does the {name} work?',
  sails: 'How do I handle the {name}?',
  nav: 'How do I use the {name}?',
  batteries: 'How do I check the {name}?',
  anchoring: 'How do I use the {name}?',
  galley: 'How does the {name} work?',
  heads: 'How does the {name} work?',
  dinghy: 'How do I launch the {name}?',
  ac: 'How does the {name} work?',
  controls: 'Where is the {name}?',
};

/** Use a short chapter title. Compound review titles stay on the generic name. */
export function suggestionName(title: string, fallback: string): string {
  const text = title.trim();
  const words = text.split(/\s+/).filter(Boolean);
  if (!text || words.length > 3 || text.length > 32 || /[&/—–]/.test(text)) {
    return fallback;
  }
  return words
    .map((word) =>
      word.length > 1 && word === word.toUpperCase() ? word : word.toLowerCase(),
    )
    .join(' ');
}

export function buildAskSuggestions(
  systems: Record<string, AskSuggestionSystem> | null | undefined,
  limit = 3,
): string[] {
  if (!systems) {
    return [];
  }
  const out: string[] = [];
  for (const systemId of ORDER) {
    const system = systems[systemId];
    if (!system) {
      continue;
    }
    const name = suggestionName(system.title ?? '', FALLBACK[systemId]);
    const question = PATTERN[systemId].replace('{name}', name);
    if (!out.includes(question)) {
      out.push(question);
    }
    if (out.length >= limit) {
      break;
    }
  }
  return out;
}

/** Published chips win. Older guides derive the same questions from their chapters. */
export function resolveAskSuggestions(
  published: string[] | undefined,
  systems: Record<string, AskSuggestionSystem> | null | undefined,
): string[] {
  const authored = (published ?? []).map((item) => item.trim()).filter(Boolean);
  if (authored.length) {
    return authored.slice(0, 3);
  }
  return buildAskSuggestions(systems);
}
