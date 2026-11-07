import { levelsFailures } from './levels.check';

describe('levels', () => {
  it('reads tanks and batteries from Signal K paths', () => {
    expect(levelsFailures()).toEqual([]);
  });
});
