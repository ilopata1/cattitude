import { logbookMathFailures } from './logbook-math.check';

describe('logbook math', () => {
  it('converts Signal K values, slots, and exports', () => {
    expect(logbookMathFailures()).toEqual([]);
  });
});
