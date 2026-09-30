/**
 * Know chapter layout. Roles come from the headings and types already
 * published. No Angular imports, so the coverage report can run in Node.
 */

import { fixCardSlugs } from '../search/guide-search';
import { ReaderView, sectionVisible } from './reader-view';

export type SectionRole = 'where' | 'task' | 'warning' | 'troubleshoot' | 'reference' | 'omit';

export interface SectionClassification {
  role: SectionRole;
  /** True when a section is a task only because no earlier rule matched. */
  defaulted: boolean;
}

export interface PresentableSection {
  t?: string;
  type?: string;
  c?: string;
  html?: string;
  items?: unknown[];
  rows?: Array<{ name?: string; location?: string }>;
  /** ``crew`` is hidden in the Guest reading view. Omitted sections show in both. */
  audience?: string;
}

export interface PresentableLink {
  target_kind?: string;
  target_id?: string;
  label?: string;
  data_guide_link?: string;
}

export interface PresentableFix {
  title?: string;
  cat?: string;
}

export interface PresentableSystem {
  id?: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  guideLinks?: PresentableLink[];
  sections?: PresentableSection[];
}

export interface PlacedSection<T extends PresentableSection = PresentableSection> {
  section: T;
  index: number;
  role: Exclude<SectionRole, 'omit'>;
  defaulted: boolean;
  showHeading: boolean;
}

export interface FixCardButton {
  title: string;
  slug: string;
}

export interface LearnLink {
  label: string;
  token: string;
}

export interface ChapterPresentation<T extends PresentableSection = PresentableSection> {
  /** Shown under the title only when the chapter has no subtitle. */
  oneLiner: string;
  /** Longer summary, shown inside the collapsed Reference block. */
  referenceSummary: string | null;
  where: PlacedSection<T>[];
  tasks: PlacedSection<T>[];
  warnings: PlacedSection<T>[];
  troubleshoot: PlacedSection<T>[];
  reference: PlacedSection<T>[];
  fixButtons: FixCardButton[];
  learnLink: LearnLink | null;
}

export interface CoverageGuide {
  systems?: Record<string, PresentableSystem>;
  ui?: { systemOrder?: string[] };
}

/** Same category map Know already used for the generic Fix It button. */
const FIX_CATEGORY_BY_SYSTEM: Record<string, string> = {
  batteries: 'electrical',
  controls: 'electrical',
  electrical: 'electrical',
  engines: 'engine',
  nav: 'nav',
  water: 'plumbing',
};

const REFERENCE_TITLES = new Set(['how it works', 'care & upkeep', 'solar charging']);
const TASK_TITLES = new Set(['turning it on', 'monitoring', 'operating']);

export function normaliseTitle(title: string | undefined): string {
  return (title || '')
    .replace(/&amp;/gi, '&')
    .replace(/[\u2018\u2019\u2032`´]/g, "'")
    .trim()
    .replace(/\s+/g, ' ')
    .toLowerCase();
}

export function classifySection(section: { t?: string; type?: string }): SectionClassification {
  const type = (section.type || '').trim().toLowerCase();
  const title = normaliseTitle(section.t);

  if (type === 'equipment_locations') {
    return { role: 'where', defaulted: false };
  }
  if (title === 'related') {
    return { role: 'omit', defaulted: false };
  }
  if (REFERENCE_TITLES.has(title)) {
    return { role: 'reference', defaulted: false };
  }
  if (type === 'notes' || type === 'photo' || isPhotoTitle(title)) {
    return { role: 'reference', defaulted: false };
  }
  if (isSpecTitle(title)) {
    return { role: 'reference', defaulted: false };
  }
  if (
    type === 'warnings' ||
    title === 'warnings' ||
    title.includes('caution') ||
    title.includes('important')
  ) {
    return { role: 'warning', defaulted: false };
  }
  if (title === "if something's not right" || title.includes('troubleshooting')) {
    return { role: 'troubleshoot', defaulted: false };
  }
  if (TASK_TITLES.has(title) || type === 'steps' || type === 'list') {
    return { role: 'task', defaulted: false };
  }
  return { role: 'task', defaulted: true };
}

export function presentChapter<T extends PresentableSection>(
  system: {
    id?: string;
    title?: string;
    subtitle?: string;
    summary?: string;
    guideLinks?: PresentableLink[];
    sections?: T[];
  },
  fixes: PresentableFix[],
  view: ReaderView = 'guest',
): ChapterPresentation<T> {
  const where: PlacedSection<T>[] = [];
  const tasks: PlacedSection<T>[] = [];
  const warnings: PlacedSection<T>[] = [];
  const troubleshoot: PlacedSection<T>[] = [];
  const reference: PlacedSection<T>[] = [];
  const groups: Record<Exclude<SectionRole, 'omit'>, PlacedSection<T>[]> = {
    where,
    task: tasks,
    warning: warnings,
    troubleshoot,
    reference,
  };

  (system.sections ?? []).forEach((section, index) => {
    if (!sectionVisible(section, view)) {
      return;
    }
    const classified = classifySection(section);
    if (classified.role === 'omit') {
      return;
    }
    const group = groups[classified.role];
    const title = (section.t || '').trim();
    const previous = group.length ? (group[group.length - 1].section.t || '').trim() : '';
    group.push({
      section,
      index,
      role: classified.role,
      defaulted: classified.defaulted,
      showHeading: headingVisible(classified.role, title, previous),
    });
  });

  const summary = summaryPlacement(system.subtitle, system.summary);
  return {
    oneLiner: summary.oneLiner,
    referenceSummary: summary.referenceSummary,
    where,
    tasks,
    warnings,
    troubleshoot,
    reference,
    fixButtons: fixButtonsFor(system, fixes),
    learnLink: learnLinkFor(system),
  };
}

export function formatCoverageReport(slug: string, guide: CoverageGuide): string {
  const lines: string[] = [];
  const counts: Record<SectionRole, number> = {
    where: 0,
    task: 0,
    warning: 0,
    troubleshoot: 0,
    reference: 0,
    omit: 0,
  };
  let defaulted = 0;
  const defaultedLines: string[] = [];
  const systems = orderedSystems(guide);

  for (const [id, system] of systems) {
    const name = (system.title || id).trim() || id;
    const placement = summaryPlacement(system.subtitle, system.summary);
    const summaryNote =
      placement.oneLiner && placement.referenceSummary
        ? 'one-liner + reference'
        : placement.oneLiner
          ? 'one-liner'
          : placement.referenceSummary
            ? 'reference'
            : 'hidden';
    lines.push(`${name} (${id}) — summary ${summaryNote}`);
    (system.sections ?? []).forEach((section, index) => {
      const classified = classifySection(section);
      counts[classified.role] += 1;
      const title = (section.t || '').trim() || '(untitled)';
      const type = (section.type || '').trim() || '(none)';
      const mark = classified.defaulted ? ' defaulted' : '';
      lines.push(`  ${classified.role}${mark} | ${type} | ${title}`);
      if (classified.defaulted) {
        defaulted += 1;
        defaultedLines.push(`  - ${name} — ${title}`);
      }
      void index;
    });
  }

  const header = [
    `${slug} — ${sumCounts(counts)} sections`,
    `  where ${counts.where}, task ${counts.task} (${defaulted} defaulted), warning ${counts.warning}, troubleshoot ${counts.troubleshoot}, reference ${counts.reference}, omitted ${counts.omit}`,
    'defaulted to task:',
    ...(defaultedLines.length ? defaultedLines : ['  (none)']),
    '',
  ];
  return [...header, ...lines].join('\n');
}

/** "Model & Specs" is reference. "Specific" is not that word. */
function isSpecTitle(title: string): boolean {
  return /\bspecs?\b/.test(title);
}

function isPhotoTitle(title: string): boolean {
  return (
    title === 'photo' ||
    title === 'photos' ||
    title.endsWith(' photo') ||
    title.endsWith(' photos')
  );
}

function headingVisible(role: Exclude<SectionRole, 'omit'>, title: string, previous: string): boolean {
  if (!title) {
    return false;
  }
  const key = normaliseTitle(title);
  if (role === 'warning' && key === 'warnings') {
    return false;
  }
  if (role === 'troubleshoot' && key === "if something's not right") {
    return false;
  }
  return title !== previous;
}

function summaryPlacement(
  subtitle: string | undefined,
  summary: string | undefined,
): { oneLiner: string; referenceSummary: string | null } {
  const sub = (subtitle || '').trim();
  const body = (summary || '').trim();
  if (!body || sameText(sub, body)) {
    return { oneLiner: '', referenceSummary: null };
  }
  if (sub) {
    return { oneLiner: '', referenceSummary: body };
  }
  const first = firstSentence(body);
  const rest = body.slice(first.length).trim();
  return { oneLiner: first, referenceSummary: rest || null };
}

function firstSentence(text: string): string {
  const match = text.match(/^[\s\S]*?[.!?](?=\s|$)/);
  return (match ? match[0] : text).trim();
}

function sameText(a: string, b: string): boolean {
  return a.replace(/\s+/g, ' ').toLowerCase() === b.replace(/\s+/g, ' ').toLowerCase();
}

function fixButtonsFor(system: PresentableSystem, fixes: PresentableFix[]): FixCardButton[] {
  const categories = fixCategories(system);
  if (!categories.length || !fixes.length) {
    return [];
  }
  const slugs = fixCardSlugs(fixes.map((fix) => fix.title || ''));
  const allowed = new Set(categories);
  const buttons: FixCardButton[] = [];
  fixes.forEach((fix, index) => {
    const cat = (fix.cat || '').trim().toLowerCase();
    if (!allowed.has(cat)) {
      return;
    }
    const title = (fix.title || '').trim();
    if (!title) {
      return;
    }
    buttons.push({ title, slug: slugs[index] });
  });
  return buttons;
}

function fixCategories(system: PresentableSystem): string[] {
  const fromLinks: string[] = [];
  for (const link of system.guideLinks ?? []) {
    if ((link.target_kind || '').trim().toLowerCase() !== 'fix') {
      continue;
    }
    const id = (link.target_id || '').trim().toLowerCase();
    if (id) {
      fromLinks.push(id);
      continue;
    }
    const token = (link.data_guide_link || '').trim().toLowerCase();
    if (token.startsWith('fix:') && token.length > 'fix:'.length) {
      fromLinks.push(token.slice('fix:'.length));
    }
  }
  if (fromLinks.length) {
    return unique(fromLinks);
  }
  const mapped = FIX_CATEGORY_BY_SYSTEM[(system.id || '').trim().toLowerCase()];
  return mapped ? [mapped] : [];
}

function learnLinkFor(system: PresentableSystem): LearnLink | null {
  for (const link of system.guideLinks ?? []) {
    const kind = (link.target_kind || '').trim().toLowerCase();
    const token = (link.data_guide_link || '').trim();
    if (kind === 'learn' || token === 'do:learn' || token === 'learn') {
      return {
        label: (link.label || '').trim() || 'Learn the Boat checklist',
        token: token || 'do:learn',
      };
    }
  }
  return null;
}

function unique(values: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const value of values) {
    if (seen.has(value)) {
      continue;
    }
    seen.add(value);
    out.push(value);
  }
  return out;
}

function orderedSystems(guide: CoverageGuide): Array<[string, PresentableSystem]> {
  const systems = guide.systems ?? {};
  const seen = new Set<string>();
  const ordered: Array<[string, PresentableSystem]> = [];
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

function sumCounts(counts: Record<SectionRole, number>): number {
  return counts.where + counts.task + counts.warning + counts.troubleshoot + counts.reference + counts.omit;
}
