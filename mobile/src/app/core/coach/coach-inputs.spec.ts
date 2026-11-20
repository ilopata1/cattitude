import { coachInputFailures } from './coach-inputs.check';

describe('coach inputs', () => {
  it('reports present, stale, and missing without filling gaps', () => {
    expect(coachInputFailures()).toEqual([]);
  });
});
