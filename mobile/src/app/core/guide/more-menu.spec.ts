import { moreMenuFailures } from './more-menu.check';

describe('more menu', () => {
  it('shows polar and a Sail label only on sailing boats', () => {
    expect(moreMenuFailures()).toEqual([]);
  });
});
