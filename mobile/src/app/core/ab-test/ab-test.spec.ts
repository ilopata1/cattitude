import { abTestFailures } from './ab-test.check';

describe('A/B test', () => {
  it('scores a settled pair of runs and keeps the procedure in order', () => {
    expect(abTestFailures()).toEqual([]);
  });
});
