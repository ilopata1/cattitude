import { magneticFailures } from './magnetic.check';

describe('magnetic bearings for display', () => {
  it('converts true to magnetic only when variation is known, and labels the north', () => {
    expect(magneticFailures()).toEqual([]);
  });
});
