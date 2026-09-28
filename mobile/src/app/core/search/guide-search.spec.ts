import { guideSearchFailures } from './guide-search.check';

describe('guide search', () => {
  it('covers supernova, sister-test, and cattitude shapes', () => {
    expect(guideSearchFailures()).toEqual([]);
  });
});
