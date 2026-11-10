import { emptyLevels, ingestLevel } from './levels';
import {
  DEFAULT_HOUSE_BATTERY_PERCENT,
  houseBatteryNotice,
  houseBatteryPercentFromText,
  houseChargePercent,
} from './house-battery';

export function houseBatteryFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const state = emptyLevels();
  expect(houseBatteryNotice(state, 30) == null, 'no house battery means no alert');
  expect(houseChargePercent(state) == null, 'charge stays unknown until the stream sends it');

  ingestLevel(state, 'electrical.batteries.1.capacity.stateOfCharge', 0.1);
  expect(houseBatteryNotice(state, 30) == null, 'another battery does not stand in for the house bank');

  ingestLevel(state, 'electrical.batteries.0.capacity.stateOfCharge', 0.3);
  expect(houseBatteryNotice(state, 30) == null, '30% is not below a 30% alert');
  ingestLevel(state, 'electrical.batteries.0.capacity.stateOfCharge', 0.31);
  expect(houseBatteryNotice(state, 30) == null, 'a charge above the setting stays quiet');

  ingestLevel(state, 'electrical.batteries.0.capacity.stateOfCharge', 0.24);
  const low = houseBatteryNotice(state, 30);
  expect(
    low?.title === 'House battery' && low.body === 'House battery is at 24%. The alert is set for 30%.',
    `house battery copy (got ${low?.title}: ${low?.body})`,
  );

  ingestLevel(state, 'electrical.batteries.0.name', 'Domestic');
  const named = houseBatteryNotice(state, 30);
  expect(named?.title === 'Domestic' && named.body.startsWith('Domestic is at 24%.'), 'a Signal K name replaces House battery');

  const blank = houseBatteryPercentFromText('');
  expect(blank.error === '' && blank.percent === DEFAULT_HOUSE_BATTERY_PERCENT, 'a blank setting stays at 30%');
  const set = houseBatteryPercentFromText('25');
  expect(set.error === '' && set.percent === 25, 'a typed percentage is kept');
  expect(houseBatteryPercentFromText('101').error.startsWith('Enter a percentage'), 'a percentage over 100 is refused');
  expect(houseBatteryPercentFromText('-1').error !== '', 'a negative percentage is refused');

  return failures;
}
