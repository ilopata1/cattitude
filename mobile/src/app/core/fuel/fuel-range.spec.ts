import { fuelRangeFailures } from './fuel-range.check';

describe('fuel range', () => {
  it('estimates hours and distance from the propeller curve', () => {
    expect(fuelRangeFailures()).toEqual([]);
  });
});
