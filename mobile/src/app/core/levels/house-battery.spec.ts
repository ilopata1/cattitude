import { houseBatteryFailures } from './house-battery.check';

describe('house battery alert', () => {
  it('alerts when the house battery charge is under the setting', () => {
    expect(houseBatteryFailures()).toEqual([]);
  });
});
