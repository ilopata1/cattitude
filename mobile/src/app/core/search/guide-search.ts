/** Offline guide search. No Angular imports so it can run in Node. */

import { ReaderView, sectionVisible } from '../guide/reader-view';

export type GuideSearchKind = 'chapter' | 'checklist' | 'fix';

export interface GuideSearchHit {
  kind: GuideSearchKind;
  title: string;
  snippet: string;
  systemId?: string;
  sectionIndex?: number;
  checklistKey?: string;
  item?: string;
  card?: string;
  /** Set on hits the Guest view cannot see. Crew search shows a suffix. */
  audience?: 'crew';
}

export interface GuideSearchGroup {
  kind: GuideSearchKind;
  label: string;
  hits: GuideSearchHit[];
}

export interface SearchableGuide {
  systems?: Record<string, SearchableSystem>;
  checklists?: Record<string, SearchableChecklist>;
  fixes?: SearchableFix[];
  ui?: {
    systemOrder?: string[];
    checklistMeta?: Record<string, { title?: string }>;
  };
}

interface SearchableSystem {
  id?: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  sections?: SearchableSection[];
}

interface SearchableSection {
  t?: string;
  c?: string;
  html?: string;
  items?: unknown[];
  rows?: Array<{ name?: string; location?: string }>;
  audience?: string;
}

interface SearchableChecklist {
  title?: string;
  audience?: string;
  groups?: Array<{
    t?: string;
    items?: unknown[];
  }>;
}

interface SearchableFix {
  title?: string;
  catL?: string;
  steps?: string[];
  guestSteps?: string[];
  audience?: string;
}

interface IndexEntry {
  kind: GuideSearchKind;
  title: string;
  fields: string[];
  systemId?: string;
  sectionIndex?: number;
  checklistKey?: string;
  item?: string;
  card?: string;
  audience?: 'crew';
}

export interface GuideIndex {
  entries: IndexEntry[];
}

const PER_GROUP = 12;
const GROUP_LABELS: Record<GuideSearchKind, string> = {
  chapter: 'Chapters',
  checklist: 'Checklists',
  fix: 'Fix It',
};
const GROUP_ORDER: GuideSearchKind[] = ['chapter', 'checklist', 'fix'];

/** Guest word → phrases that may appear in the guide. Not reversed. */
const SYNONYMS: Record<string, string[]> = {
  toilet: ['heads'],
  ac: ['air conditioning'],
  genset: ['generator'],
  windlass: ['anchor'],
  breaker: ['panel', 'czone'],
  tender: ['dinghy'],
};

const TAGS = /<[^>]+>/g;

export function buildGuideIndex(guide: SearchableGuide, view: ReaderView = 'guest'): GuideIndex {
  const entries: IndexEntry[] = [];
  for (const [id, system] of orderedSystems(guide)) {
    const systemId = (system.id || id).trim();
    const systemTitle = text(system.title) || systemId;
    const header = [systemTitle, text(system.subtitle), text(system.summary)].filter(Boolean);
    if (header.length) {
      entries.push({
        kind: 'chapter',
        title: systemTitle,
        fields: header,
        systemId,
      });
    }
    (system.sections ?? []).forEach((section, sectionIndex) => {
      if (!sectionVisible(section, view)) {
        return;
      }
      const fields = sectionFields(section);
      if (!fields.length) {
        return;
      }
      const sectionTitle = text(section.t);
      entries.push({
        kind: 'chapter',
        title: sectionTitle ? `${systemTitle} · ${sectionTitle}` : systemTitle,
        fields,
        systemId,
        sectionIndex,
        audience: crewMark(view, section.audience),
      });
    });
  }

  const checklists = guide.checklists ?? {};
  for (const [key, checklist] of Object.entries(checklists)) {
    if (view === 'guest' && checklist.audience === 'crew') {
      continue;
    }
    const checklistTitle =
      text(checklist.title) || text(guide.ui?.checklistMeta?.[key]?.title) || key;
    (checklist.groups ?? []).forEach((group, groupIndex) => {
      const groupTitle = text(group.t);
      (group.items ?? []).forEach((item, itemIndex) => {
        if (view === 'guest' && itemAudience(item) === 'crew') {
          return;
        }
        const parts = itemParts(item, view);
        const fields = [groupTitle, ...parts].filter(Boolean);
        if (!fields.length) {
          return;
        }
        entries.push({
          kind: 'checklist',
          title: checklistTitle,
          fields,
          checklistKey: key,
          item: `${groupIndex}-${itemIndex}`,
          audience: crewMark(view, checklist.audience === 'crew' ? 'crew' : itemAudience(item)),
        });
      });
    });
  }

  const fixes = (guide.fixes ?? []).filter((fix) => view === 'crew' || fix.audience !== 'crew');
  const slugs = fixCardSlugs(fixes.map((fix) => text(fix.title)));
  fixes.forEach((fix, index) => {
    const title = text(fix.title) || 'Fix It';
    const steps =
      view === 'guest' && fix.guestSteps?.length ? fix.guestSteps : (fix.steps ?? []);
    const fields = [title, text(fix.catL), ...steps.map((step) => text(step))].filter(Boolean);
    if (!fields.length) {
      return;
    }
    entries.push({
      kind: 'fix',
      title,
      fields,
      card: slugs[index],
      audience: crewMark(view, fix.audience),
    });
  });

  return { entries };
}

export function searchGuide(index: GuideIndex, query: string): GuideSearchGroup[] {
  const trimmed = query.trim();
  if (trimmed.length < 2) {
    return [];
  }
  const tokens = queryTokens(trimmed);
  if (!tokens.length) {
    return [];
  }
  const grouped: Record<GuideSearchKind, GuideSearchHit[]> = {
    chapter: [],
    checklist: [],
    fix: [],
  };
  for (const entry of index.entries) {
    const hits = grouped[entry.kind];
    if (hits.length >= PER_GROUP || !entryMatches(entry.fields, tokens)) {
      continue;
    }
    hits.push({
      kind: entry.kind,
      title: entry.title,
      snippet: snippetFor(entry.fields, tokens),
      systemId: entry.systemId,
      sectionIndex: entry.sectionIndex,
      checklistKey: entry.checklistKey,
      item: entry.item,
      card: entry.card,
      audience: entry.audience,
    });
  }
  return GROUP_ORDER.filter((kind) => grouped[kind].length).map((kind) => ({
    kind,
    label: GROUP_LABELS[kind],
    hits: grouped[kind],
  }));
}

/** Stable within one published fix list. A repeated title gets -2, -3, … */
export function fixCardSlugs(titles: string[]): string[] {
  const seen = new Map<string, number>();
  return titles.map((title) => {
    const base = title.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'card';
    const count = (seen.get(base) ?? 0) + 1;
    seen.set(base, count);
    return count === 1 ? base : `${base}-${count}`;
  });
}

function orderedSystems(guide: SearchableGuide): Array<[string, SearchableSystem]> {
  const systems = guide.systems ?? {};
  const seen = new Set<string>();
  const ordered: Array<[string, SearchableSystem]> = [];
  for (const id of guide.ui?.systemOrder ?? []) {
    const system = systems[id];
    if (system && !seen.has(id)) {
      ordered.push([id, system]);
      seen.add(id);
    }
  }
  for (const [id, system] of Object.entries(systems)) {
    if (!seen.has(id)) {
      ordered.push([id, system]);
    }
  }
  return ordered;
}

function sectionFields(section: SearchableSection): string[] {
  const fields = [text(section.t), plain(section.c), plain(section.html)].filter(Boolean);
  for (const item of section.items ?? []) {
    fields.push(...itemParts(item));
  }
  for (const row of section.rows ?? []) {
    const name = text(row?.name);
    const location = text(row?.location);
    if (name && location) {
      fields.push(`${name} — ${location}`);
    } else if (name || location) {
      fields.push(name || location);
    }
  }
  return fields;
}

/** Crew search labels a hit guests cannot see. Guest search never indexes those hits. */
function crewMark(view: ReaderView, audience: string | undefined): 'crew' | undefined {
  return view === 'crew' && audience === 'crew' ? 'crew' : undefined;
}

function itemAudience(item: unknown): string | undefined {
  if (!item || typeof item !== 'object') {
    return undefined;
  }
  const audience = (item as Record<string, unknown>)['audience'];
  return typeof audience === 'string' ? audience : undefined;
}

function itemParts(item: unknown, view: ReaderView = 'crew'): string[] {
  if (typeof item === 'string') {
    const value = text(item);
    return value ? [value] : [];
  }
  if (!item || typeof item !== 'object') {
    return [];
  }
  const record = item as Record<string, unknown>;
  const guestCopy = text(typeof record['gc'] === 'string' ? record['gc'] : '');
  const keys =
    view === 'guest' && guestCopy
      ? ['gc', 's', 'text', 'content', 'label', 'title', 'body']
      : ['c', 's', 'text', 'content', 'label', 'title', 'body'];
  const parts: string[] = [];
  for (const key of keys) {
    const value = record[key];
    if (typeof value === 'string') {
      const cleaned = text(value);
      if (cleaned) {
        parts.push(cleaned);
      }
    }
  }
  return parts;
}

function queryTokens(query: string): string[][] {
  return wordsOf(query).map((word) => [word, ...(SYNONYMS[word] ?? [])]);
}

function entryMatches(fields: string[], tokens: string[][]): boolean {
  const haystack = fields.join('\n');
  return tokens.every((alternatives) =>
    alternatives.some((phrase) => containsPhrase(haystack, phrase)),
  );
}

function containsPhrase(haystack: string, phrase: string): boolean {
  const needle = wordsOf(phrase);
  if (!needle.length) {
    return false;
  }
  const words = wordsOf(haystack);
  for (let index = 0; index <= words.length - needle.length; index += 1) {
    if (needle.every((word, offset) => words[index + offset] === word)) {
      return true;
    }
  }
  return false;
}

function snippetFor(fields: string[], tokens: string[][]): string {
  let best = fields[0] ?? '';
  let bestScore = -1;
  for (const field of fields) {
    const score = tokens.filter((alternatives) =>
      alternatives.some((phrase) => containsPhrase(field, phrase)),
    ).length;
    if (score > bestScore) {
      best = field;
      bestScore = score;
    }
  }
  const plainText = best.replace(/\s+/g, ' ').trim();
  const span = firstSpan(plainText, tokens);
  if (!span) {
    return clip(plainText, 80);
  }
  return sentenceOrWindow(plainText, span);
}

function firstSpan(text: string, tokens: string[][]): { start: number; end: number } | null {
  for (const alternatives of tokens) {
    for (const phrase of alternatives) {
      const span = findSpan(text, phrase);
      if (span) {
        return span;
      }
    }
  }
  return null;
}

function findSpan(text: string, phrase: string): { start: number; end: number } | null {
  const words = wordsOf(phrase);
  if (!words.length) {
    return null;
  }
  const pattern = new RegExp(words.map(escapeRegExp).join('[^a-z0-9]+'), 'i');
  const match = pattern.exec(text);
  if (!match) {
    return null;
  }
  return { start: match.index, end: match.index + match[0].length };
}

function sentenceOrWindow(text: string, span: { start: number; end: number }): string {
  let start = 0;
  for (let index = span.start - 1; index >= 0; index -= 1) {
    const char = text.charAt(index);
    if (char === '.' || char === '!' || char === '?') {
      start = index + 1;
      break;
    }
  }
  let end = text.length;
  for (let index = span.end; index < text.length; index += 1) {
    const char = text.charAt(index);
    if (char === '.' || char === '!' || char === '?') {
      end = index + 1;
      break;
    }
  }
  const sentence = text.slice(start, end).trim();
  if (sentence.length <= 140) {
    return sentence;
  }
  const windowStart = Math.max(0, span.start - 30);
  const windowEnd = Math.min(text.length, span.end + 50);
  let window = text.slice(windowStart, windowEnd).trim();
  if (windowStart > 0) {
    window = `…${window}`;
  }
  if (windowEnd < text.length) {
    window = `${window}…`;
  }
  return window;
}

function clip(text: string, max: number): string {
  if (text.length <= max) {
    return text;
  }
  return `${text.slice(0, max - 1).replace(/\s+$/, '')}…`;
}

function wordsOf(value: string): string[] {
  return value.toLowerCase().match(/[a-z0-9]+/g) ?? [];
}

function plain(value: string | undefined): string {
  return decodeEntities(String(value ?? '').replace(TAGS, ' ')).replace(/\s+/g, ' ').trim();
}

function text(value: string | undefined): string {
  return String(value ?? '').replace(/\s+/g, ' ').trim();
}

function decodeEntities(value: string): string {
  return value
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}
