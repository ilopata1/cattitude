/**
 * Home dashboard catalog and persona defaults.
 * Layouts store catalog ids. This module has no Angular imports.
 */

import { classifySection } from './chapter-presentation';
import { moreMenu } from './more-menu';
import { groupTopics, isPowerPart, POWER_TOPIC_ID, topicIcon, topicTitle } from './power-topic';
import { ReaderView } from './reader-view';

export type DashboardGroup = 'do' | 'know' | 'fix' | 'more' | 'widgets';

export interface DashboardItem {
  id: string;
  kind: 'shortcut' | 'widget';
  group: DashboardGroup;
  label: string;
  subtitle: string;
  icon: string;
  /** Path segments under the vessel tabs route. */
  segments: string[];
  query?: Record<string, string>;
  /** Hidden from the Guest layout and the Guest add list. */
  crewOnly: boolean;
  /** Set on Know sections and on the electrical, controls, and batteries shortcuts. */
  parentId?: string;
  /** Columns on the 2-column home grid. Paired readings use 1. Wind and rules use the full row. */
  span: 1 | 2;
}

export interface DashboardSystemInput {
  id: string;
  title: string;
  icon?: string;
  subtitle?: string;
  sections?: Array<{ t?: string; type?: string; audience?: string }>;
}

export interface DashboardDoItemInput {
  key: string;
  title: string;
  subtitle?: string;
  icon?: string;
  progressType?: string;
}

export interface DashboardCatalogInput {
  vesselType: string | null | undefined;
  systems: DashboardSystemInput[];
  doMenu: Array<{ items: DashboardDoItemInput[] }>;
  learnAvailable: boolean;
  rulesAvailable: boolean;
}

const MORE_ICONS: Record<string, string> = {
  ask: '💬',
  sail: '⛵',
  polar: '📈',
  anchorage: '⚓',
  settings: '⚙️',
};

const GUEST_DEFAULT = ['learn', 'do:safety-brief', 'know:heads', 'more:ask'];
const CREW_SHORTCUTS = ['know:engines', 'know:electrical', 'know:power', 'more:sail', 'more:anchorage', 'fix'];
const CREW_LIVE = ['widget:depth', 'widget:speed', 'widget:wind'];

export function buildDashboardCatalog(input: DashboardCatalogInput): DashboardItem[] {
  const items: DashboardItem[] = [];
  if (input.learnAvailable) {
    items.push(shortcut({
      id: 'learn',
      group: 'do',
      label: 'Learn the boat',
      subtitle: 'A short path through this boat',
      icon: '📘',
      segments: ['do', 'learn'],
    }));
  }
  const seenDo = new Set<string>();
  for (const section of input.doMenu) {
    for (const item of section.items) {
      if (item.progressType === 'learn' || !item.key || seenDo.has(item.key)) {
        continue;
      }
      seenDo.add(item.key);
      items.push(shortcut({
        id: `do:${item.key}`,
        group: 'do',
        label: item.title,
        subtitle: item.subtitle || '',
        icon: item.icon || '✅',
        segments: ['do', 'checklist', item.key],
      }));
    }
  }

  if (input.rulesAvailable) {
    items.push(shortcut({
      id: 'rules',
      group: 'know',
      label: 'Boat rules',
      subtitle: 'Never, always, and good habits',
      icon: '📋',
      segments: ['home', 'rules'],
    }));
  }

  const topics = groupTopics(input.systems);
  for (const topic of topics) {
    const id = `know:${topic.id}`;
    items.push(shortcut({
      id,
      group: 'know',
      label: topicTitle(topic),
      subtitle: topic.id === POWER_TOPIC_ID ? 'Electrical, controls, and batteries' : (topic.systems[0]?.subtitle || ''),
      icon: topicIcon(topic) || '📘',
      segments: ['know'],
      query: { system: topic.id },
    }));
    for (const system of topic.systems) {
      if (isPowerPart(system.id)) {
        items.push(shortcut({
          id: `know:${system.id}`,
          group: 'know',
          label: system.title || system.id,
          subtitle: 'Power',
          icon: system.icon || '⚡',
          segments: ['know'],
          query: { system: system.id },
          parentId: id,
        }));
      }
      (system.sections ?? []).forEach((section, index) => {
        const label = (section.t || '').trim();
        if (!label || classifySection(section).role === 'omit') {
          return;
        }
        items.push(shortcut({
          id: `know:${system.id}:s:${index}`,
          group: 'know',
          label,
          subtitle: system.title || topicTitle(topic),
          icon: system.icon || topicIcon(topic) || '📘',
          segments: ['know'],
          query: { system: system.id, section: String(index) },
          crewOnly: section.audience === 'crew',
          parentId: id,
        }));
      });
    }
  }

  items.push(shortcut({
    id: 'fix',
    group: 'fix',
    label: 'Fix It',
    subtitle: 'When something is not working',
    icon: '🔧',
    segments: ['fix'],
  }));

  for (const row of moreMenu(input.vesselType)) {
    items.push(shortcut({
      id: `more:${row.id}`,
      group: 'more',
      label: row.label,
      subtitle: row.subtitle,
      icon: MORE_ICONS[row.id] || '•',
      segments: ['more', ...row.route],
    }));
  }

  items.push(
    widget('widget:depth', 'Depth', 'Live depth', '🌊', 1),
    widget('widget:speed', 'Speed', 'Live speed', '🚤', 1),
    widget('widget:wind', 'Wind', 'Live wind', '💨', 2),
  );
  if (input.rulesAvailable) {
    items.push(widget('widget:rules', 'Boat rules', 'Never, always, and good habits', '📋', 2));
  }
  return items;
}

export function defaultTileIds(
  view: ReaderView,
  catalog: DashboardItem[],
  signalK: boolean,
): string[] {
  const ids = new Set(visibleItems(catalog, view).map((item) => item.id));
  if (view === 'guest') {
    return GUEST_DEFAULT.filter((id) => ids.has(id));
  }
  const shortcuts = CREW_SHORTCUTS.filter((id) => {
    if (id === 'know:power' && ids.has('know:electrical')) {
      return false;
    }
    return ids.has(id);
  });
  const live = signalK ? CREW_LIVE.filter((id) => ids.has(id)) : [];
  return [...shortcuts, ...live];
}

/** Saved `undefined` means the persona default. An empty list is a cleared home. */
export function layoutIds(
  saved: string[] | undefined,
  view: ReaderView,
  catalog: DashboardItem[],
  signalK: boolean,
): string[] {
  const chosen = saved ?? defaultTileIds(view, catalog, signalK);
  return resolveDashboard(chosen, catalog, view).map((item) => item.id);
}

export function resolveDashboard(
  ids: string[],
  catalog: DashboardItem[],
  view: ReaderView,
): DashboardItem[] {
  const byId = new Map(visibleItems(catalog, view).map((item) => [item.id, item]));
  const resolved: DashboardItem[] = [];
  const seen = new Set<string>();
  for (const id of ids) {
    const item = byId.get(id);
    if (!item || seen.has(id)) {
      continue;
    }
    seen.add(id);
    resolved.push(item);
  }
  return resolved;
}

export function visibleItems(catalog: DashboardItem[], view: ReaderView): DashboardItem[] {
  return view === 'crew' ? catalog : catalog.filter((item) => !item.crewOnly);
}

function shortcut(item: Omit<DashboardItem, 'kind' | 'span' | 'crewOnly'> & { crewOnly?: boolean }): DashboardItem {
  return {
    ...item,
    kind: 'shortcut',
    span: 1,
    crewOnly: item.crewOnly === true,
  };
}

function widget(id: string, label: string, subtitle: string, icon: string, span: 1 | 2): DashboardItem {
  return {
    id,
    kind: 'widget',
    group: 'widgets',
    label,
    subtitle,
    icon,
    segments: id === 'widget:rules' ? ['home', 'rules'] : ['more', 'sail'],
    crewOnly: false,
    span,
  };
}
