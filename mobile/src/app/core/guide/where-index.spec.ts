import { whereIndexFailures } from './where-index.check';

describe('where index', () => {
  it('maps equipment rows onto the vessel zone list', () => {
    expect(whereIndexFailures()).toEqual([]);
  });
});
