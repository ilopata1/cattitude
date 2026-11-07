import { levelDashboardItems } from '../guide/dashboard';
import {
  emptyLevels,
  ingestLevel,
  ingestLevelMeta,
  levelGroups,
  levelWidgetId,
  levelWidgetValue,
} from './levels';

export function levelsFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const state = emptyLevels();
  ingestLevel(state, 'tanks.fuel.0.currentLevel', 0.525);
  ingestLevel(state, 'tanks.fuel.0.capacity', 0.3);
  ingestLevel(state, 'self.tanks.fuel.1.currentLevel', 0.527);
  ingestLevel(state, 'vessels.urn:mrn:signalk:uuid:abc.tanks.fuel.1.capacity', 0.3);
  ingestLevel(state, 'tanks.freshWater.4.currentLevel', 1);
  ingestLevel(state, 'tanks.freshWater.4.capacity', 0.27);
  ingestLevel(state, 'tanks.freshWater.2.currentLevel', 0.41);
  ingestLevel(state, 'tanks.freshWater.2.capacity', 0.27);
  ingestLevel(state, 'tanks.blackWater.5.currentLevel', 0.23);
  ingestLevel(state, 'tanks.blackWater.5.capacity', 0.065);
  ingestLevel(state, 'tanks.blackWater.3.currentLevel', 0.5);
  ingestLevel(state, 'tanks.blackWater.3.capacity', 0.065);
  ingestLevel(state, 'tanks.greyWater.9.currentLevel', 0.8);
  ingestLevel(state, 'tanks.greyWater.9.capacity', 0.1);
  ingestLevel(state, 'electrical.batteries.1.voltage', 26.4);
  ingestLevel(state, 'electrical.batteries.0.voltage', 27);
  ingestLevel(state, 'electrical.batteries.0.current', -1);
  ingestLevel(state, 'electrical.batteries.0.temperature', 301.15);

  const groups = levelGroups(state);
  expect(
    groups.map((group) => group.label).join('|') === 'Fuel|Drinking water|Sewage holding tank|Batteries',
    `group order (got ${groups.map((group) => group.label).join('|')})`,
  );
  const fuel = groups[0].tanks;
  expect(fuel.map((tank) => tank.title).join(',') === 'Fuel tank 0,Fuel tank 1', 'fuel titles follow instance order');
  expect(fuel[0].face === '52.5% of 300 L' && fuel[0].fill === 52.5, `fuel 0 face (got ${fuel[0].face})`);
  expect(fuel[1].face === '52.7% of 300 L', `fuel 1 face (got ${fuel[1].face})`);
  const water = groups[1].tanks;
  expect(water.map((tank) => tank.face).join('|') === '41% of 270 L|100% of 270 L', `water faces (got ${water.map((tank) => tank.face).join('|')})`);
  const sewage = groups[2].tanks;
  expect(sewage.map((tank) => tank.face).join('|') === '50% of 65 L|23% of 65 L', `sewage faces (got ${sewage.map((tank) => tank.face).join('|')})`);
  expect(!groups.some((group) => group.tanks.some((tank) => tank.title.includes('9'))), 'grey water is left out');

  const house = groups[3].batteries[0];
  const second = groups[3].batteries[1];
  expect(house.title === 'House battery', 'battery 0 falls back to House battery');
  expect(second.title === 'Battery 1', 'other batteries use their instance');
  expect(house.voltage === '27.0 V' && house.current === '−1.0 A' && house.temperature === '28 °C', `battery readings (got ${house.voltage}, ${house.current}, ${house.temperature})`);
  expect(house.charge === '—' && house.chargeFill == null, 'charge stays empty until the stream sends it');
  ingestLevel(state, 'electrical.batteries.0.capacity.stateOfCharge', 0.84);
  const charged = levelGroups(state)[3].batteries[0];
  expect(charged.charge === '84%' && charged.chargeFill === 84, `state of charge (got ${charged.charge})`);

  expect(levelWidgetValue(state, levelWidgetId('fuel', '0')) === '52.5%', 'a fuel tile shows the percent');
  expect(levelWidgetValue(state, levelWidgetId('battery', '0')) === '27.0 V', 'a battery tile shows voltage');
  expect(levelWidgetValue(state, 'widget:aws') == null, 'other tiles are left to the sail readings');

  ingestLevel(state, 'tanks.fuel.0.name', 'Port fuel');
  expect(levelGroups(state)[0].tanks[0].title === 'Port fuel', 'a Signal K name replaces the fallback');
  ingestLevelMeta(state, 'tanks.fuel.0', { displayName: 'Ignored' });
  expect(levelGroups(state)[0].tanks[0].title === 'Port fuel', 'meta does not replace a path name');
  ingestLevelMeta(state, 'tanks.freshWater.2.currentLevel', { displayName: 'Galley' });
  expect(levelGroups(state)[1].tanks[0].title === 'Galley', 'meta names a tank that has no name value');

  ingestLevel(state, 'tanks.fuel.0.currentLevel', null);
  const cleared = levelGroups(state)[0].tanks[0];
  expect(cleared.face === '— of 300 L' && cleared.fill == null, `a missing level keeps the capacity (got ${cleared.face})`);
  expect(levelWidgetValue(state, levelWidgetId('fuel', '0')) === '—', 'a tile with no level shows a dash');

  const partial = emptyLevels();
  ingestLevel(partial, 'tanks.fuel.0.currentLevel', 52.5);
  expect(levelGroups(partial)[0].tanks[0].face === '52.5%', 'without capacity the face is the percent');

  const packed = emptyLevels();
  ingestLevel(packed, 'electrical.batteries.house', {
    voltage: 25.5,
    current: 4.2,
    temperature: 28,
    name: 'Start',
    capacity: { stateOfCharge: 80 },
  });
  const start = levelGroups(packed)[0].batteries[0];
  expect(start.title === 'Start' && start.charge === '80%' && start.voltage === '25.5 V', 'a battery object is unpacked');
  expect(start.current === '4.2 A' && start.temperature === '28 °C', 'positive current keeps its sign and celsius is left alone');
  ingestLevel(packed, 'electrical.batteries.house.temperature', 500);
  expect(levelGroups(packed)[0].batteries[0].temperature === '28 °C', 'an impossible temperature does not wipe the last reading');

  const tiles = levelDashboardItems(state);
  expect(tiles[0].label === 'Port fuel' && tiles[0].subtitle === 'Fuel', 'the add list uses the Signal K name and the tank type');
  expect(tiles.some((item) => item.id === levelWidgetId('battery', '0') && item.label === 'House battery'), 'the house battery is addable');

  return failures;
}
