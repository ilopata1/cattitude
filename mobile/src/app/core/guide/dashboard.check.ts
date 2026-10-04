import {
  buildDashboardCatalog,
  DashboardCatalogInput,
  defaultTileIds,
  layoutIds,
  visibleItems,
} from './dashboard';

export function dashboardFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };

  const sailing = buildDashboardCatalog(sample('sailing_catamaran'));
  const byId = new Map(sailing.map((item) => [item.id, item]));

  expect(!byId.has('do:learn'), 'learn checklist is not also a Do shortcut');
  expect(byId.get('do:safety-brief')?.segments.join('/') === 'do/checklist/safety-brief', 'safety briefing route');
  expect(byId.get('know:power')?.query?.['system'] === 'power', 'power topic opens the Power chapter');
  expect(byId.get('know:electrical')?.parentId === 'know:power', 'electrical sits under Power');
  expect(byId.get('know:engines:s:0')?.label === 'Starting', 'engine section keeps its index');
  expect(!byId.has('know:engines:s:1'), 'related sections are omitted');
  expect(byId.get('know:engines:s:2')?.crewOnly === true, 'crew section is marked');
  expect(byId.get('know:heads:s:0')?.query?.['section'] === '0', 'heads section deep link');
  expect(byId.has('more:polar'), 'sailing catalog includes polar');
  expect(byId.get('more:sail')?.label === 'Sail', 'sailing sail label');
  expect(byId.has('widget:rules') && byId.has('rules'), 'rules are a page shortcut and a widget');

  expect(byId.get('do:pd')?.crewOnly === true, 'crew checklist is marked');
  expect(byId.get('do:gh')?.crewOnly === false, 'giving a hand stays on the guest home');
  expect(
    defaultTileIds('guest', sailing, true).join(',') ===
      'learn,do:safety-brief,do:gh,know:overview,know:heads,more:ask',
    'guest default',
  );
  expect(
    !defaultTileIds('guest', sailing, true).includes('do:pd'),
    'guest default hides a crew checklist',
  );
  expect(
    !visibleItems(sailing, 'guest').some((item) => item.id === 'do:pd'),
    'guest add list hides a crew checklist',
  );
  expect(
    visibleItems(sailing, 'crew').some((item) => item.id === 'do:pd'),
    'crew can still open a crew checklist',
  );
  expect(
    defaultTileIds('crew', sailing, true).join(',') ===
      'widget:aws,widget:tws,widget:sog,widget:awa,widget:heading,widget:cog,widget:polar,know:engines,know:electrical,more:sail,more:anchorage,fix,more:ask',
    'crew default leads with live readings',
  );
  expect(byId.get('widget:aws')?.span === 1 && byId.get('widget:polar')?.span === 2, 'wind readings share a cell and polar uses the row');
  expect(
    defaultTileIds('crew', sailing, false).join(',') === 'know:engines,know:electrical,more:sail,more:anchorage,fix,more:ask',
    'crew default without Signal K omits live widgets',
  );
  expect(
    layoutIds(['know:engines:s:2', 'learn', 'learn', 'missing'], 'guest', sailing, false).join(',') === 'learn',
    'guest layout drops crew-only and unknown tiles',
  );
  expect(layoutIds([], 'guest', sailing, false).length === 0, 'a cleared home stays empty');
  expect(
    layoutIds(undefined, 'guest', sailing, false).join(',') ===
      'learn,do:safety-brief,do:gh,know:overview,know:heads,more:ask',
    'an unsaved home uses the guest default',
  );

  const power = buildDashboardCatalog(sample('power_catamaran'));
  const powerIds = power.map((item) => item.id);
  expect(!powerIds.includes('more:polar'), 'power boats hide polar');
  expect(!powerIds.includes('widget:polar'), 'power boats hide the polar widget');
  expect(power.find((item) => item.id === 'more:sail')?.label === 'Instruments', 'power sail row is Instruments');

  const withoutElectrical = buildDashboardCatalog({
    ...sample('sailing_catamaran'),
    systems: sample('sailing_catamaran').systems.filter((system) => system.id !== 'electrical'),
  });
  expect(
    defaultTileIds('crew', withoutElectrical, false).includes('know:power'),
    'crew default uses Power when Electrical is absent',
  );
  expect(
    !defaultTileIds('crew', withoutElectrical, false).includes('know:electrical'),
    'missing electrical is not in the crew default',
  );

  return failures;
}

function sample(vesselType: string): DashboardCatalogInput {
  return {
    vesselType,
    learnAvailable: true,
    rulesAvailable: true,
    doMenu: [
      {
        items: [
          { key: 'learn', title: 'Learn', icon: '📘', progressType: 'learn' },
          { key: 'safety-brief', title: 'Safety briefing', icon: '🛟', subtitle: 'Before departure', progressType: 'checklist' },
          { key: 'gh', title: 'Giving a hand', icon: '🤝', subtitle: 'What a guest can do to help', progressType: 'checklist' },
          { key: 'pd', title: 'Pre-departure', icon: '🚀', subtitle: 'Before leaving', progressType: 'checklist', crewOnly: true },
        ],
      },
    ],
    systems: [
      {
        id: 'overview',
        title: 'Overview',
        icon: '🗺️',
        subtitle: 'Find your way around',
        sections: [{ t: 'Welcome', type: 'prose' }],
      },
      {
        id: 'engines',
        title: 'Engines',
        icon: '⚙️',
        subtitle: 'Both engines',
        sections: [
          { t: 'Starting', type: 'steps' },
          { t: 'Related', type: 'prose' },
          { t: 'Hull connections', type: 'list', audience: 'crew' },
        ],
      },
      { id: 'electrical', title: 'Electrical', icon: '⚡', sections: [{ t: 'Shore power', type: 'steps' }] },
      { id: 'controls', title: 'Controls', icon: '🎛️', sections: [] },
      { id: 'batteries', title: 'Batteries', icon: '🔋', sections: [] },
      { id: 'heads', title: 'Heads', icon: '🚽', subtitle: 'Toilets', sections: [{ t: 'Flushing', type: 'steps' }] },
    ],
  };
}
