/**
 * One Power topic over the published electrical, controls, and batteries
 * modules. The modules stay separate. No Angular imports.
 */

import { classifySection, normaliseTitle, presentChapter, PresentableFix, PresentableSection } from './chapter-presentation';

export const POWER_TOPIC_ID = 'power';
export const POWER_PART_IDS = ['electrical', 'controls', 'batteries'] as const;

export function isPowerPart(id: string | undefined): boolean {
  return !!id && (POWER_PART_IDS as readonly string[]).includes(id);
}

export function sectionDomId(systemId: string, index: number): string {
  return `know-sec-${systemId}-${index}`;
}

export interface TopicGroup<T extends { id: string }> {
  id: string;
  systems: T[];
}

export interface PowerSystem<T extends PresentableSection = PresentableSection> {
  id?: string;
  title?: string;
  subtitle?: string;
  summary?: string;
  icon?: string;
  guideLinks?: Parameters<typeof presentChapter<T>>[0]['guideLinks'];
  sections?: T[];
}

export interface PowerPlaced<T extends PresentableSection = PresentableSection> {
  section: T;
  systemId: string;
  index: number;
  role: string;
  showHeading: boolean;
  /** The DOM id lives on this copy. A split location table sets the other copy false. */
  anchor: boolean;
  inReference: boolean;
}

export interface PowerNote {
  heading: string;
  text: string;
}

export interface PowerPresentation<T extends PresentableSection = PresentableSection> {
  subtitle: string;
  where: PowerPlaced<T>[];
  switching: PowerPlaced<T>[];
  battery: PowerPlaced<T>[];
  loads: PowerPlaced<T>[];
  generator: PowerPlaced<T>[];
  shore: PowerPlaced<T>[];
  warnings: PowerPlaced<T>[];
  troubleshoot: PowerPlaced<T>[];
  reference: PowerPlaced<T>[];
  referenceNotes: PowerNote[];
  generatorButtons: { title: string; slug: string }[];
  fixButtons: { title: string; slug: string }[];
  learnLink: { label: string; token: string } | null;
  report: PowerReportLine[];
}

export interface PowerReportLine {
  systemId: string;
  title: string;
  type: string;
  bucket: string;
}

export interface PowerScrollTarget {
  domId: string;
  inReference: boolean;
}

type BucketName =
  | 'where'
  | 'switching'
  | 'battery'
  | 'loads'
  | 'generator'
  | 'shore'
  | 'warning'
  | 'troubleshoot'
  | 'reference';

export function groupTopics<T extends { id: string }>(ordered: T[]): TopicGroup<T>[] {
  const groups: TopicGroup<T>[] = [];
  let power: TopicGroup<T> | null = null;
  for (const system of ordered) {
    if (!isPowerPart(system.id)) {
      groups.push({ id: system.id, systems: [system] });
      continue;
    }
    if (!power) {
      power = { id: POWER_TOPIC_ID, systems: [] };
      groups.push(power);
    }
    power.systems.push(system);
  }
  return groups;
}

export function powerSubtitle(systems: Array<{ id?: string; subtitle?: string }>): string {
  const controls = systems.find((system) => system.id === 'controls');
  const electrical = systems.find((system) => system.id === 'electrical');
  const batteries = systems.find((system) => system.id === 'batteries');
  return (controls?.subtitle || electrical?.subtitle || batteries?.subtitle || '').trim();
}

export function topicTitle<T extends { id: string; title?: string }>(topic: TopicGroup<T>): string {
  if (topic.id === POWER_TOPIC_ID) {
    return 'Power';
  }
  return topic.systems[0]?.title || topic.id;
}

export function topicIcon<T extends { id: string; icon?: string }>(topic: TopicGroup<T>): string {
  if (topic.id === POWER_TOPIC_ID) {
    return '⚡';
  }
  return topic.systems[0]?.icon || '';
}

export function presentPower<T extends PresentableSection>(
  members: Array<PowerSystem<T> & { id: string }>,
  fixes: PresentableFix[],
  galley: PowerSystem<T> | null,
): PowerPresentation<T> {
  const where: PowerPlaced<T>[] = [];
  const switching: PowerPlaced<T>[] = [];
  const battery: PowerPlaced<T>[] = [];
  const loads: PowerPlaced<T>[] = [];
  const generator: PowerPlaced<T>[] = [];
  const shore: PowerPlaced<T>[] = [];
  const warnings: PowerPlaced<T>[] = [];
  const troubleshoot: PowerPlaced<T>[] = [];
  const reference: PowerPlaced<T>[] = [];
  const buckets: Record<BucketName, PowerPlaced<T>[]> = {
    where,
    switching,
    battery,
    loads,
    generator,
    shore,
    warning: warnings,
    troubleshoot,
    reference,
  };
  const report: PowerReportLine[] = [];
  const referenceNotes: PowerNote[] = [];
  const notes: PowerNote[] = [];
  let learnLink: PowerPresentation<T>['learnLink'] = null;
  const fixButtons: PowerPresentation<T>['fixButtons'] = [];
  const seenSlugs = new Set<string>();

  const place = (
    bucket: BucketName,
    section: T,
    systemId: string,
    index: number,
    anchor: boolean,
  ): void => {
    const group = buckets[bucket];
    const title = (section.t || '').trim();
    const previous = group.length ? (group[group.length - 1].section.t || '').trim() : '';
    group.push({
      section,
      systemId,
      index,
      role: classifySection(section).role,
      showHeading: headingVisible(title, previous),
      anchor,
      inReference: bucket === 'reference',
    });
  };

  for (const system of members) {
    const chapter = presentChapter(system, fixes);
    if (!learnLink && chapter.learnLink) {
      learnLink = chapter.learnLink;
    }
    for (const button of chapter.fixButtons) {
      if (seenSlugs.has(button.slug)) {
        continue;
      }
      seenSlugs.add(button.slug);
      fixButtons.push(button);
    }
    if (chapter.referenceSummary) {
      notes.push({ heading: system.title || system.id, text: chapter.referenceSummary });
    }
    (system.sections ?? []).forEach((section, index) => {
      const title = (section.t || '').trim() || '(untitled)';
      const type = (section.type || '').trim() || '(none)';
      const classified = classifySection(section);
      if (classified.role === 'omit') {
        report.push({ systemId: system.id, title, type, bucket: 'omitted' });
        return;
      }
      const bucket = bucketFor(system.id, section);
      if (bucket === 'where') {
        const split = splitLocationRows(section);
        if (split.rest) {
          place('where', split.rest, system.id, index, true);
        }
        if (split.generator) {
          place('generator', split.generator, system.id, index, !split.rest);
        }
        report.push({
          systemId: system.id,
          title,
          type,
          bucket: split.rest && split.generator ? 'where+generator' : split.generator ? 'generator' : 'where',
        });
        return;
      }
      place(bucket, section, system.id, index, true);
      report.push({ systemId: system.id, title, type, bucket });
    });
  }

  const galleyId = galley?.id || 'galley';
  (galley?.sections ?? []).forEach((section, index) => {
    if (!normaliseTitle(section.t).includes('generator')) {
      return;
    }
    place('generator', section, galleyId, index, true);
    report.push({
      systemId: galleyId,
      title: (section.t || '').trim() || '(untitled)',
      type: (section.type || '').trim() || '(none)',
      bucket: 'generator',
    });
  });

  if (notes.length === 1) {
    referenceNotes.push({ heading: 'About this system', text: notes[0].text });
  } else {
    for (const note of notes) {
      referenceNotes.push({ heading: `About ${note.heading}`, text: note.text });
    }
  }

  const generatorButtons = fixButtons.filter((button) => /generator/i.test(button.title));
  const otherButtons = fixButtons.filter((button) => !/generator/i.test(button.title));

  return {
    subtitle: powerSubtitle(members),
    where,
    switching,
    battery,
    loads,
    generator,
    shore,
    warnings,
    troubleshoot,
    reference,
    referenceNotes,
    generatorButtons,
    fixButtons: otherButtons,
    learnLink,
    report,
  };
}

export function powerScrollTarget<T extends PresentableSection>(
  power: PowerPresentation<T>,
  systemId: string | null,
  index: number | null,
): PowerScrollTarget {
  const anchored = anchoredPlacements(power);
  if (!systemId) {
    return { domId: 'know-sec-top', inReference: false };
  }
  const forSystem = anchored.filter((placed) => placed.systemId === systemId);
  const match =
    index == null
      ? forSystem[0]
      : forSystem.find((placed) => placed.index === index) ?? forSystem[0];
  if (!match) {
    return { domId: 'know-sec-top', inReference: false };
  }
  return {
    domId: sectionDomId(match.systemId, match.index),
    inReference: match.inReference,
  };
}

export function formatPowerCoverage(
  slug: string,
  guide: {
    systems?: Record<string, PowerSystem & { id?: string }>;
    ui?: { systemOrder?: string[] };
  },
  fixes: PresentableFix[],
): string {
  const systems = guide.systems ?? {};
  const order = guide.ui?.systemOrder ?? Object.keys(systems);
  const members = order
    .map((id) => systems[id])
    .filter((system): system is PowerSystem & { id: string } => !!system && isPowerPart(system.id));
  for (const [id, system] of Object.entries(systems)) {
    if (system && isPowerPart(id) && !members.some((member) => member.id === id)) {
      members.push({ ...system, id });
    }
  }
  const power = presentPower(members, fixes, systems['galley'] ? { ...systems['galley'], id: 'galley' } : null);
  const procedure = power.generator.some((placed) => normaliseTitle(placed.section.t).includes('generator'));
  const absent = [
    procedure ? '' : 'no generator procedure',
    power.loads.length ? '' : 'no big-loads section',
    power.shore.length ? '' : 'no shore-power section',
  ].filter(Boolean);
  const counts = [
    `where ${power.where.length}`,
    `switching ${power.switching.length}`,
    `battery ${power.battery.length}`,
    `loads ${power.loads.length}`,
    `generator ${power.generator.length}`,
    `shore ${power.shore.length}`,
    `warning ${power.warnings.length}`,
    `troubleshoot ${power.troubleshoot.length}`,
    `reference ${power.reference.length}`,
  ];
  const lines = [
    `${slug} power — ${power.subtitle || '(no subtitle)'}`,
    `  ${counts.join(', ')}`,
    `  generator cards: ${power.generatorButtons.map((button) => button.title).join(' / ') || '(none)'}`,
    `  other electrical cards: ${power.fixButtons.map((button) => button.title).join(' / ') || '(none)'}`,
    absent.length ? `  absent: ${absent.join('; ')}` : '  absent: (none)',
    ...power.report.map((line) => `  ${line.systemId} | ${line.bucket} | ${line.type} | ${line.title}`),
  ];
  return lines.join('\n');
}

function bucketFor(systemId: string, section: PresentableSection): BucketName {
  const title = normaliseTitle(section.t);
  if (title.includes('generator')) {
    return 'generator';
  }
  if (title.includes('shore')) {
    return 'shore';
  }
  if (title.includes('drain') || title.includes('power balance') || /\bloads?\b/.test(title)) {
    return 'loads';
  }
  const role = classifySection(section).role;
  if (role === 'where') {
    return 'where';
  }
  if (role === 'warning') {
    return 'warning';
  }
  if (role === 'troubleshoot') {
    return 'troubleshoot';
  }
  if (role === 'reference') {
    return 'reference';
  }
  if (systemId === 'batteries') {
    return 'battery';
  }
  return 'switching';
}

function splitLocationRows<T extends PresentableSection>(
  section: T,
): { rest: T | null; generator: T | null } {
  const rows = Array.isArray(section.rows) ? section.rows : [];
  const rest = [];
  const generator = [];
  let carried = '';
  for (const row of rows) {
    const named = (row?.name || '').trim();
    if (named) {
      carried = named;
    }
    const gear = named || carried;
    if (isGeneratorGear(gear)) {
      generator.push(row);
    } else {
      rest.push(row);
    }
  }
  return {
    rest: rest.length ? { ...section, rows: rest } : null,
    generator: generator.length ? { ...section, rows: generator } : null,
  };
}

function isGeneratorGear(name: string): boolean {
  return /generator|\bpanda\b|genset/i.test(name);
}

function headingVisible(title: string, previous: string): boolean {
  if (!title) {
    return false;
  }
  const key = normaliseTitle(title);
  if (key === 'equipment locations' || key === 'warnings' || key === "if something's not right") {
    return false;
  }
  return title !== previous;
}

function anchoredPlacements<T extends PresentableSection>(power: PowerPresentation<T>): PowerPlaced<T>[] {
  return [
    ...power.where,
    ...power.switching,
    ...power.battery,
    ...power.loads,
    ...power.generator,
    ...power.shore,
    ...power.warnings,
    ...power.troubleshoot,
    ...power.reference,
  ].filter((placed) => placed.anchor);
}
