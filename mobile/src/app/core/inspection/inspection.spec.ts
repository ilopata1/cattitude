import { inspectionFailures } from './inspection.check';

describe('daily inspection', () => {
  it('keeps a note and a day, and merges the boat’s copy', () => {
    expect(inspectionFailures()).toEqual([]);
  });
});
