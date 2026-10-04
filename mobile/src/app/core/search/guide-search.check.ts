import { buildGuideIndex, fixCardSlugs, searchGuide, SearchableGuide } from './guide-search';

function hits(guide: SearchableGuide, query: string): string[] {
  const lines: string[] = [];
  for (const group of searchGuide(buildGuideIndex(guide), query)) {
    for (const hit of group.hits) {
      lines.push(
        `${group.label}|${hit.title}|${hit.snippet}|${hit.sectionIndex ?? ''}|${hit.item ?? ''}|${hit.card ?? ''}`,
      );
    }
  }
  return lines;
}

export function guideSearchFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const supernova: SearchableGuide = {
    systems: {
      engines: {
        id: 'engines',
        title: 'Engines',
        summary: 'Propulsion is handled by the engines.',
        sections: [
          {
            t: 'Operating',
            html: '<p>Stop each engine from the Nanni instrument panel after a short idle.</p>',
          },
          {
            t: 'Equipment Locations',
            rows: [
              { name: 'Nanni N4.65', location: 'Port engine bay' },
              { name: '', location: 'Starboard engine bay' },
            ],
          },
          { t: 'Pre-start', items: ['Confirm raw water flows from the exhaust'] },
        ],
      },
      electrical: {
        id: 'electrical',
        title: 'Electrical',
        sections: [{ t: 'Panel', c: 'Shore power is switched at the panel.' }],
      },
    },
    checklists: {
      pd: {
        groups: [{ t: 'Engine room', items: [{ c: 'Seacocks open', s: 'Handle parallel to the pipe' }] }],
      },
    },
    fixes: [{ title: 'Engine will not start', catL: 'Engine', steps: ['Check the CZone panel is powered.'] }],
    ui: {
      systemOrder: ['engines', 'electrical'],
      checklistMeta: { pd: { title: 'Pre-departure' } },
    },
  };

  const operating = hits(supernova, 'nanni instrument');
  expect(
    operating.some((line) => line.startsWith('Chapters|Engines · Operating|') && line.includes('|0|')),
    `html-only Operating was not found: ${operating.join(' / ')}`,
  );
  expect(
    operating.some((line) => line.includes('Stop each engine from the Nanni instrument panel')),
    `Operating snippet lost the sentence: ${operating.join(' / ')}`,
  );

  const bays = hits(supernova, 'starboard engine bay');
  expect(
    bays.some((line) => line.includes('Engines · Equipment Locations') && line.includes('|1|')),
    `blank location name was not indexed: ${bays.join(' / ')}`,
  );

  const exhaust = hits(supernova, 'raw water');
  expect(
    exhaust.some((line) => line.includes('Engines · Pre-start')),
    `string list item was not found: ${exhaust.join(' / ')}`,
  );

  const seacocks = hits(supernova, 'parallel to the pipe');
  expect(
    seacocks.some((line) => line.startsWith('Checklists|Pre-departure|') && line.includes('|0-0|')),
    `checklist s was not found: ${seacocks.join(' / ')}`,
  );

  const czone = hits(supernova, 'czone');
  expect(
    czone.some((line) => line.startsWith('Fix It|Engine will not start|') && line.endsWith('|engine-will-not-start')),
    `fix card was not found: ${czone.join(' / ')}`,
  );

  const sister: SearchableGuide = {
    systems: {
      water: {
        id: 'water',
        title: 'Water systems',
        sections: [{ t: 'Turning it on', c: 'Start the watermaker from the NAVIGATOR control panel.' }],
      },
    },
  };
  const sisterHits = searchGuide(buildGuideIndex(sister), 'navigator');
  expect(
    sisterHits.length === 1 && sisterHits[0].kind === 'chapter',
    `sister-test should only return a chapter: ${JSON.stringify(sisterHits)}`,
  );
  expect(
    searchGuide(buildGuideIndex(sister), 'seacock').length === 0,
    'sister-test invented a checklist hit',
  );

  const cattitude: SearchableGuide = {
    systems: {
      anchoring: {
        id: 'anchoring',
        title: 'Anchoring',
        sections: [
          { t: 'Procedure', items: [{ i: 1, c: 'Open the chain locker hatch' }] },
          { t: 'Notes', items: ['Keep the bridle clear of the roller'] },
          { t: 'Layout photo', html: '<p><img src="chain-counter.png" alt=""></p>' },
        ],
      },
      heads: {
        id: 'heads',
        title: 'Heads',
        sections: [{ t: 'Using the heads', c: 'The heads flush with fresh water.' }],
      },
      ac: {
        id: 'ac',
        title: 'Air conditioning',
        sections: [{ t: 'Using it', c: 'Cabin climate is air conditioning from the panel.' }],
      },
    },
  };
  const hatch = hits(cattitude, 'chain locker');
  expect(
    hatch.some((line) => line.includes('Anchoring · Procedure')),
    `{i, c} item was not found: ${hatch.join(' / ')}`,
  );
  const bridle = hits(cattitude, 'bridle');
  expect(
    bridle.some((line) => line.includes('Anchoring · Notes')),
    `string item was not found: ${bridle.join(' / ')}`,
  );
  expect(
    hits(cattitude, 'png').length === 0 && hits(cattitude, 'chain-counter').length === 0,
    'photo markup was searchable',
  );
  expect(
    hits(cattitude, 'layout photo').some((line) => line.includes('Anchoring · Layout photo')),
    'photo section title was skipped',
  );

  const toilet = hits(cattitude, 'toilet');
  expect(
    toilet.some((line) => line.includes('Heads · Using the heads')),
    `toilet did not match heads: ${toilet.join(' / ')}`,
  );
  const ac = hits(cattitude, 'ac');
  expect(
    ac.some((line) => line.includes('Air conditioning')),
    `ac did not match air conditioning: ${ac.join(' / ')}`,
  );
  expect(
    hits({ systems: { overview: { id: 'overview', title: 'Welcome', summary: 'Find your place aboard.' } } }, 'ac')
      .length === 0,
    'ac matched inside place',
  );
  const breaker = hits(supernova, 'breaker');
  expect(
    breaker.some((line) => line.includes('CZone') || line.includes('Electrical · Panel')),
    `breaker did not match panel or CZone: ${breaker.join(' / ')}`,
  );

  expect(searchGuide(buildGuideIndex(supernova), 'a').length === 0, 'one-letter query returned hits');

  const tagged: SearchableGuide = {
    systems: {
      water: {
        id: 'water',
        title: 'Water',
        sections: [
          { t: 'Showers', c: 'Take short showers.' },
          { t: 'Hull connections', c: 'Open both cold hull connections.', audience: 'crew' },
        ],
      },
    },
  };
  expect(hits(tagged, 'hull connections').length === 0, 'guest search returned a crew section');
  expect(hits(tagged, 'showers').length === 1, 'guest search hid an untagged section');
  const crewHull: string[] = [];
  for (const group of searchGuide(buildGuideIndex(tagged, 'crew'), 'hull connections')) {
    for (const hit of group.hits) {
      crewHull.push(String(hit.sectionIndex));
    }
  }
  expect(crewHull.join(',') === '1', `crew search lost the original section index: ${crewHull.join(',')}`);
  expect(
    fixCardSlugs(['Engine will not start', 'Engine will not start']).join(',') ===
      'engine-will-not-start,engine-will-not-start-2',
    'duplicate fix titles did not get a suffix',
  );

  const crewLists: SearchableGuide = {
    checklists: {
      pd: {
        audience: 'crew',
        groups: [{ t: 'Engines', items: [{ c: 'Open the raw water seacock before starting' }] }],
      },
      'safety-brief': {
        groups: [
          {
            t: 'Life jackets',
            items: [
              {
                c: 'Show guests the stowage locker',
                gc: 'I know where my life jacket is',
              },
              { c: 'Explain the valve sequence', audience: 'crew' },
            ],
          },
        ],
      },
    },
    ui: {
      checklistMeta: {
        pd: { title: 'Pre-departure' },
        'safety-brief': { title: 'Safety briefing' },
      },
    },
  };
  expect(hits(crewLists, 'seacock').length === 0, 'guest search returned a crew checklist');
  expect(hits(crewLists, 'stowage').length === 0, 'guest search indexed the skipper line');
  expect(hits(crewLists, 'valve sequence').length === 0, 'guest search returned a crew item');
  expect(
    hits(crewLists, 'life jacket').some((line) => line.includes('I know where my life jacket is')),
    'guest search missed the guest-voice line',
  );
  const crewSeacock: string[] = [];
  for (const group of searchGuide(buildGuideIndex(crewLists, 'crew'), 'seacock')) {
    for (const hit of group.hits) {
      crewSeacock.push(hit.title);
    }
  }
  expect(crewSeacock.join(',') === 'Pre-departure', `crew search missed the crew checklist: ${crewSeacock.join(',')}`);

  return failures;
}
