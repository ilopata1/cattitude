import { classifySection, formatCoverageReport, presentChapter } from './chapter-presentation';

export function chapterPresentationFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const photo = { t: 'Layout', type: 'photo', html: '<img src="chain-counter.png">' };
  const steps = { t: 'Pre-Start', type: 'steps', items: [{ i: 1, c: 'Confirm the lever is in neutral' }] };
  const chapter = presentChapter(
    {
      id: 'engines',
      title: 'Engines',
      subtitle: 'Propulsion is handled by the engines.',
      summary: 'Propulsion is handled by the engines.',
      guideLinks: [
        {
          target_kind: 'fix',
          target_id: 'engine',
          label: 'Fix It cards for engine',
          data_guide_link: 'fix:engine',
        },
        {
          target_kind: 'learn',
          target_id: 'learn',
          label: 'Learn the Boat checklist',
          data_guide_link: 'do:learn',
        },
        { target_kind: 'system', target_id: 'batteries', label: 'Batteries', data_guide_link: 'system:batteries' },
      ],
      sections: [
        { t: 'Equipment Locations', type: 'equipment_locations', rows: [{ name: 'Nanni', location: 'Port bay' }] },
        { t: 'How it works', type: 'prose', c: 'Two engines.' },
        { t: 'Turning it on', type: 'prose', c: 'Start each engine from the panel.' },
        { t: 'Operating', type: 'list', items: ['Stop after a short idle.'] },
        { t: 'Operating', type: 'prose', c: 'Folded sibling that should hide its heading.' },
        { t: "If something's not right", type: 'prose', c: 'No raw water at the exhaust.' },
        { t: 'Care & upkeep', type: 'prose', c: 'Check the belt.' },
        { t: 'Related', type: 'prose', c: 'Open the Fix It cards for engine.' },
        photo,
        { t: 'Model & Specs', type: 'prose', c: 'Nanni N4.65' },
        steps,
        { t: 'How the Clutches Work', type: 'prose', c: 'The clutches grip the line.' },
        { t: 'Guest-Safe Troubleshooting', type: 'prose', c: 'Stop and look.' },
        { t: 'Manual Free-Fall — Use With Extreme Caution', type: 'steps', items: ['Hold the clutch.'] },
        { t: 'Cockpit Rigging — Photos', type: 'prose', html: '<img>' },
        { t: 'Notes', type: 'notes', c: 'Installer note.' },
      ],
    },
    [
      { title: "Engine won't start", cat: 'engine' },
      { title: 'Engine overheating alarm', cat: 'engine' },
      { title: "Engine won't start", cat: 'engine' },
      { title: 'Air conditioning not working', cat: 'electrical' },
      { title: 'Windlass not working', cat: 'general' },
    ],
  );

  expect(classifySection({ t: 'Care & upkeep', type: 'prose' }).role === 'reference', 'care is reference');
  expect(classifySection(photo).role === 'reference', 'photo type is reference');
  expect(classifySection({ t: 'Related', type: 'prose' }).role === 'omit', 'related is omitted');
  expect(classifySection(steps).role === 'task' && !classifySection(steps).defaulted, 'steps are tasks');
  expect(classifySection({ t: 'Model & Specs', type: 'prose' }).role === 'reference', 'specs are reference');
  expect(
    classifySection({ t: 'Whale Cut — Specific Conditions Required', type: 'warnings' }).role === 'warning',
    'specific does not count as a spec sheet',
  );
  expect(
    classifySection({ t: 'Turning it on', type: 'prose' }).role === 'task' &&
      !classifySection({ t: 'Turning it on', type: 'prose' }).defaulted,
    'turning it on is a task',
  );
  expect(
    classifySection({ t: 'How the Clutches Work', type: 'prose' }).defaulted,
    'unmatched prose stays a task and is reported',
  );
  expect(
    classifySection({ t: 'If something\u2019s not right', type: 'prose' }).role === 'troubleshoot',
    'curly apostrophe still matches the troubleshooting title',
  );

  expect(chapter.oneLiner === '' && chapter.referenceSummary === null, 'summary that repeats the subtitle is hidden');
  expect(chapter.where.length === 1 && chapter.where[0].index === 0, 'locations stay in document order');
  expect(
    chapter.tasks.map((placed) => placed.section.t).join('|') ===
      'Turning it on|Operating|Operating|Pre-Start|How the Clutches Work',
    'task order',
  );
  expect(chapter.tasks[2].showHeading === false, 'consecutive duplicate task heading is hidden');
  expect(chapter.tasks[4].defaulted, 'clutches heading is defaulted');
  expect(chapter.tasks.includes(chapter.tasks.find((placed) => placed.section === steps)!), 'steps object is kept');
  expect(
    chapter.warnings.map((placed) => placed.section.t).join('|') ===
      'Manual Free-Fall — Use With Extreme Caution',
    'caution title is a warning',
  );
  expect(
    chapter.troubleshoot.map((placed) => placed.section.t).join('|') ===
      "If something's not right|Guest-Safe Troubleshooting",
    'troubleshooting sections stay together',
  );
  expect(chapter.troubleshoot[0].showHeading === false, 'stock troubleshooting title uses the group label');
  expect(
    chapter.reference.map((placed) => placed.section.t).join('|') ===
      'How it works|Care & upkeep|Layout|Model & Specs|Cockpit Rigging — Photos|Notes',
    'reference holds how-it-works, care, photos, specs, and notes',
  );
  expect(
    !chapter.tasks.concat(chapter.reference, chapter.troubleshoot).some((placed) => placed.section.t === 'Related'),
    'related prose is not rendered',
  );
  expect(
    chapter.fixButtons.map((button) => `${button.title}|${button.slug}`).join(',') ===
      "Engine won't start|engine-won-t-start,Engine overheating alarm|engine-overheating-alarm,Engine won't start|engine-won-t-start-2",
    'fix buttons are the cards in the linked category',
  );
  expect(chapter.learnLink?.label === 'Learn the Boat checklist' && chapter.learnLink.token === 'do:learn', 'learn stays a text link');

  const legacy = presentChapter(
    {
      id: 'anchoring',
      subtitle: '',
      summary: 'The windlass is on the crossbeam. Count the chain before you leave it.',
      sections: [{ t: 'Deploying the Anchor', type: 'steps', items: [{ i: 1, c: 'Ease the clutch.' }] }],
    },
    [{ title: 'Windlass not working', cat: 'general' }],
  );
  expect(legacy.fixButtons.length === 0, 'anchoring does not guess the general windlass card');
  expect(legacy.oneLiner === 'The windlass is on the crossbeam.', 'missing subtitle uses the first sentence');
  expect(
    legacy.referenceSummary === 'Count the chain before you leave it.',
    'the rest of a long summary goes to reference',
  );

  const mapped = presentChapter({ id: 'engines', sections: [] }, [{ title: "Engine won't start", cat: 'engine' }]);
  expect(mapped.fixButtons.length === 1 && mapped.fixButtons[0].slug === 'engine-won-t-start', 'cattitude engines use the category map');

  const sister = presentChapter(
    { id: 'engines', guideLinks: [{ target_kind: 'fix', target_id: 'engine', data_guide_link: 'fix:engine' }] },
    [],
  );
  expect(sister.fixButtons.length === 0, 'a category with no cards has no buttons');

  const longer = presentChapter(
    {
      id: 'water',
      subtitle: 'Fresh water',
      summary: 'The tanks sit under the saloon floor.',
      sections: [],
    },
    [],
  );
  expect(longer.oneLiner === '' && longer.referenceSummary === 'The tanks sit under the saloon floor.', 'a longer summary is reference');

  const report = formatCoverageReport('fixture', {
    ui: { systemOrder: ['engines'] },
    systems: {
      engines: {
        id: 'engines',
        title: 'Engines',
        sections: [
          { t: 'About this boat', type: 'prose' },
          { t: 'Related', type: 'prose' },
        ],
      },
    },
  });
  expect(report.includes('defaulted to task:') && report.includes('Engines — About this boat'), 'coverage names defaulted titles');
  expect(report.includes('omitted 1'), 'coverage counts related as omitted');

  return failures;
}
