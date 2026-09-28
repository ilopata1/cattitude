import { learnPathFailures } from './learn-path.check';

describe('learn path', () => {
  it('builds a path from the systems a vessel has', () => {
    expect(learnPathFailures()).toEqual([]);
  });
});
