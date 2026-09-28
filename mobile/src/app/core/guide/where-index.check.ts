import { buildWhereIndex, locationZoneIds, resolveWhereIndex } from './where-index';

const DASH = '\u2013';

export function whereIndexFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const zone = (location: string) =>
    buildWhereIndex(
      {
        engines: {
          sections: [{ type: 'equipment_locations', rows: [{ name: 'Gear', location }] }],
        },
      },
      ['engines'],
      'sailing_catamaran',
    ).items[0].zone;

  expect(zone('Saloon / Living Area') === 'saloon_living_area', 'saloon');
  expect(
    zone('Saloon / Living Area (Under sofa near chart table)') === 'saloon_living_area',
    'saloon detail',
  );
  expect(
    zone(`Port ${DASH} Engine / Machinery Space ${DASH} Generator Compartment (Wing locker)`) ===
      'engine_machinery_space',
    'generator',
  );
  expect(zone('Port (was: port hull)') === null, 'port hull leftover');
  expect(zone('Flybridge / Upper Deck') === null, 'flybridge on a sailing cat');

  const continued = buildWhereIndex(
    {
      engines: {
        sections: [
          {
            type: 'equipment_locations',
            rows: [
              {
                name: 'Fischer Panda',
                location: `Port ${DASH} Engine / Machinery Space ${DASH} Generator Compartment`,
              },
              { name: '', location: 'Saloon / Living Area' },
            ],
          },
        ],
      },
    },
    ['engines'],
    'sailing_catamaran',
  );
  expect(
    continued.items.map((item) => item.name).join('|') === 'Fischer Panda|Fischer Panda',
    'blank name continues',
  );
  expect(
    continued.items.map((item) => item.zone).join('|') === 'engine_machinery_space|saloon_living_area',
    'continued row zones',
  );

  const cat = locationZoneIds('sailing_catamaran');
  expect(cat.indexOf('flybridge_upper_deck') === -1 && cat.indexOf('rigging_sail_handling') !== -1, 'cat zones');
  const tri = locationZoneIds('sailing_trimaran');
  expect(tri.indexOf('rigging_sail_handling') !== -1 && tri.indexOf('flybridge_upper_deck') === -1, 'trimaran');
  const power = locationZoneIds('power_catamaran');
  expect(power.indexOf('flybridge_upper_deck') !== -1 && power.indexOf('rigging_sail_handling') === -1, 'power cat');
  const sport = locationZoneIds('sport_fishing');
  expect(
    sport.indexOf('flybridge_upper_deck') !== -1 &&
      sport.indexOf('rigging_sail_handling') === -1 &&
      sport.indexOf('port-hull') === -1,
    'sport fishing',
  );

  const empty = buildWhereIndex(
    { overview: { sections: [{ type: 'list', rows: [] }] } },
    ['overview'],
    'sailing_catamaran',
  );
  expect(empty.items.length === 0 && empty.zones.length === 0, 'prose is not a location list');

  const stored = {
    items: [
      {
        name: 'Stored',
        location: 'Saloon / Living Area',
        zone: 'saloon_living_area',
        systemId: 'nav',
        sectionIndex: 0,
      },
    ],
    zones: [{ id: 'saloon_living_area', label: 'Saloon / Living Area' }],
  };
  expect(resolveWhereIndex(stored, {}, ['engines'], 'sailing_catamaran').items[0].name === 'Stored', 'stored index');
  expect(
    resolveWhereIndex(undefined, empty.items.length ? {} : { engines: { sections: [] } }, ['engines'], 'sport_fishing')
      .items.length === 0,
    'missing index is derived',
  );
  return failures;
}
