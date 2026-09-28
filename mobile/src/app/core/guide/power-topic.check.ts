import {
  formatPowerCoverage,
  groupTopics,
  isPowerPart,
  powerScrollTarget,
  presentPower,
  POWER_TOPIC_ID,
} from './power-topic';

export function powerTopicFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const grouped = groupTopics([
    { id: 'engines' },
    { id: 'controls' },
    { id: 'electrical' },
    { id: 'batteries' },
    { id: 'water' },
  ]);
  expect(
    grouped.map((topic) => topic.id).join(',') === `engines,${POWER_TOPIC_ID},water`,
    'power replaces the three cards at the first of them',
  );
  expect(
    grouped[1].systems.map((system) => system.id).join(',') === 'controls,electrical,batteries',
    'power keeps the three modules in order',
  );
  expect(!isPowerPart('galley') && isPowerPart('batteries'), 'only the three power ids collapse');

  const zone = groupTopics([{ id: 'engines' }, { id: 'electrical' }, { id: 'batteries' }]);
  expect(zone.map((topic) => topic.id).join(',') === `engines,${POWER_TOPIC_ID}`, 'a zone lists power once');

  const fixes = [
    { title: 'Low battery', cat: 'electrical' },
    { title: "Generator won't start", cat: 'electrical' },
    { title: 'Generator alarm or stopped', cat: 'electrical' },
    { title: "Toilet won't flush", cat: 'plumbing' },
  ];
  const learn = {
    target_kind: 'learn',
    target_id: 'learn',
    label: 'Learn the Boat checklist',
    data_guide_link: 'do:learn',
  };
  const czone = presentPower(
    [
      {
        id: 'controls',
        title: 'Controls and Monitoring',
        subtitle: 'Switching and monitoring run through the touchscreen (CZone Touch 7).',
        guideLinks: [learn],
        sections: [
          { t: 'Monitoring', type: 'prose', c: 'Open Monitoring.' },
          { t: 'Operating', type: 'prose', c: 'Modes let you control several circuits.' },
          { t: "If something's not right", type: 'prose', c: 'Open the alarm.' },
          { t: 'Related', type: 'prose', c: 'Boilerplate.' },
        ],
      },
      {
        id: 'electrical',
        title: 'Electrical Panel',
        subtitle: 'Battery banks are combined and isolated automatically.',
        summary: 'Battery banks are combined and isolated automatically.',
        sections: [
          {
            t: 'Equipment Locations',
            type: 'equipment_locations',
            rows: [{ name: 'ACR', location: 'Engine bay' }],
          },
          { t: 'How it works', type: 'prose', c: 'Leave the ACR in automatic.' },
          { t: 'Operating', type: 'prose', c: 'Use the rotary isolator to disconnect.' },
          { t: 'Care & upkeep', type: 'prose', c: 'The ProInstaller busbar.' },
          { t: 'Related', type: 'prose', c: 'Boilerplate.' },
          { t: 'Using electricity', type: 'list', items: ['Switch off unused loads.'] },
        ],
      },
      {
        id: 'batteries',
        title: 'Batteries & Energy',
        subtitle: 'The house bank is three house batteries.',
        summary: 'The house bank is three lithium batteries. Solar feeds them through the MPPTs.',
        sections: [
          {
            t: 'Equipment Locations',
            type: 'equipment_locations',
            rows: [
              { name: 'MLI Ultra', location: 'Engine bay' },
              { name: 'Fischer Panda Panda 8000i', location: 'Generator compartment' },
            ],
          },
          { t: 'How it works', type: 'prose', c: 'Inverter-chargers convert shore or generator AC.' },
          { t: 'Monitoring', type: 'prose', c: 'Watch state of charge.' },
          { t: 'Operating', type: 'prose', c: 'Set the AC input current limit.' },
          { t: 'Solar charging', type: 'prose', c: 'Arrays feed the bank.' },
          { t: 'Related', type: 'prose', c: 'Boilerplate.' },
        ],
      },
    ],
    fixes,
    {
      id: 'galley',
      sections: [
        { t: 'Rubbish', type: 'list', items: ['Bins are in the galley.'] },
        { t: 'Generator Operation', type: 'steps', items: ['Start from the panel.'] },
      ],
    },
  );

  expect(
    czone.subtitle.startsWith('Switching and monitoring run through the touchscreen'),
    'a published controls chapter supplies the power one-liner',
  );
  expect(
    czone.switching.map((placed) => `${placed.systemId}:${placed.section.t}`).join('|') ===
      'controls:Monitoring|controls:Operating|electrical:Operating|electrical:Using electricity',
    'switching is the touchscreen, then leftover electrical tasks',
  );
  expect(
    czone.battery.map((placed) => placed.section.t).join('|') === 'Monitoring|Operating',
    'battery operating stays with battery level',
  );
  expect(czone.loads.length === 0 && czone.shore.length === 0, 'supernova has no loads or shore section');
  expect(
    czone.reference.map((placed) => placed.section.t).join('|') ===
      'How it works|Care & upkeep|How it works|Solar charging',
    'installer and how-it-works text stays in reference',
  );
  expect(
    czone.where.some((placed) => placed.section.rows?.some((row) => row.name === 'MLI Ultra')) &&
      !czone.where.some((placed) => placed.section.rows?.some((row) => /panda/i.test(row.name || ''))),
    'the house bank stays in the location table',
  );
  expect(
    czone.generator.some((placed) =>
      placed.section.rows?.some((row) => row.name === 'Fischer Panda Panda 8000i'),
    ),
    'the panda row is under generator',
  );
  expect(
    czone.generator.some((placed) => placed.section.t === 'Generator Operation' && placed.systemId === 'galley'),
    'galley generator steps also appear under power',
  );
  expect(
    !czone.generator.some((placed) => placed.section.t === 'Rubbish'),
    'other galley sections stay in galley',
  );
  expect(
    czone.generatorButtons.map((button) => button.title).join('|') ===
      "Generator won't start|Generator alarm or stopped",
    'generator cards sit on the generator bucket',
  );
  expect(
    czone.fixButtons.map((button) => button.title).join('|') === 'Low battery',
    'electrical cards are listed once',
  );
  expect(czone.learnLink?.token === 'do:learn', 'one learn link');
  expect(
    czone.referenceNotes.map((note) => note.heading).join('|') === 'About this system',
    'only the longer battery summary is reference',
  );
  const panda = powerScrollTarget(czone, 'batteries', 0);
  expect(panda.domId === 'know-sec-batteries-0' && !panda.inReference, 'the location section keeps its id');
  const care = powerScrollTarget(czone, 'electrical', 3);
  expect(care.domId === 'know-sec-electrical-3' && care.inReference, 'care scrolls inside reference');
  expect(
    !czone.report.some((line) => line.bucket !== 'omitted' && line.title === 'Related'),
    'related is omitted',
  );

  const panel = presentPower(
    [
      {
        id: 'electrical',
        title: 'Electrical Panel',
        subtitle: 'DC breakers, AC systems, and shore power',
        sections: [
          { t: 'System Overview', type: 'prose', c: 'The panel is in the saloon.' },
          { t: 'DC Panel Switches — What They Do', type: 'list', items: ['Lights.'] },
          { t: 'Shore Power Connection', type: 'steps', items: ['Plug in.'] },
          { t: 'Warnings', type: 'warnings', items: ['Do not bypass a breaker.'] },
        ],
      },
      {
        id: 'batteries',
        title: 'Batteries & Solar',
        subtitle: 'Victron system',
        sections: [
          { t: 'The Victron HUB-1 Display', type: 'prose', c: 'Read state of charge.' },
          { t: 'Common Power Drains', type: 'list', items: ['Fridges.'] },
          { t: 'Power Balance — Net Awareness', type: 'list', items: ['Watch the trend.'] },
          { t: 'Warnings', type: 'warnings', items: ['Keep the bank above 80%.'] },
        ],
      },
    ],
    [],
    {
      id: 'galley',
      sections: [{ t: 'Generator Operation', type: 'steps', items: ['Start the generator.'] }],
    },
  );
  expect(panel.subtitle === 'DC breakers, AC systems, and shore power', 'breaker boats use the electrical subtitle');
  expect(
    panel.switching.map((placed) => placed.section.t).join('|') ===
      'System Overview|DC Panel Switches — What They Do',
    'the breaker panel is switching when there is no controls chapter',
  );
  expect(panel.shore.map((placed) => placed.section.t).join('|') === 'Shore Power Connection', 'shore is its own bucket');
  expect(
    panel.loads.map((placed) => placed.section.t).join('|') === 'Common Power Drains|Power Balance — Net Awareness',
    'drains and power balance are big loads',
  );
  expect(panel.battery.map((placed) => placed.section.t).join('|') === 'The Victron HUB-1 Display', 'the display is battery level');
  expect(panel.generatorButtons.length === 0 && panel.fixButtons.length === 0, 'no cards means no buttons');
  expect(panel.warnings.length === 2, 'warnings from both chapters stay visible');

  const sister = presentPower(
    [
      {
        id: 'controls',
        subtitle: 'Switching and monitoring run through the touchscreen.',
        sections: [{ t: 'Monitoring', type: 'prose', c: 'Open Monitoring.' }],
      },
      {
        id: 'electrical',
        sections: [{ t: 'How it works', type: 'prose', c: 'Shore or generator AC.' }],
      },
      {
        id: 'batteries',
        sections: [{ t: 'Operating', type: 'prose', c: 'Set the current limit.' }],
      },
    ],
    [],
    null,
  );
  expect(sister.generator.length === 0 && sister.fixButtons.length === 0, 'sister test has no generator block');
  expect(sister.reference.map((placed) => placed.section.t).join('|') === 'How it works', 'the combi sentence stays in reference');

  const report = formatPowerCoverage(
    'fixture',
    {
      ui: { systemOrder: ['electrical', 'batteries'] },
      systems: {
        electrical: {
          id: 'electrical',
          subtitle: 'DC breakers',
          sections: [{ t: 'Operating', type: 'prose' }],
        },
        batteries: { id: 'batteries', sections: [{ t: 'Monitoring', type: 'prose' }] },
      },
    },
    [],
  );
  expect(report.includes('no generator procedure') && report.includes('no shore-power section'), 'coverage names the gaps');
  expect(report.includes('electrical | switching | prose | Operating'), 'coverage names the bucket');

  return failures;
}
