import { moreMenuFailures } from './more-menu.check';

describe('more menu', () => {
  it('shows polar, A/B test, and a Sail label only on sailing boats', () => {
    expect(moreMenuFailures()).toEqual([]);
  });
});
