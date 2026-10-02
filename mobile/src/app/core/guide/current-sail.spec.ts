import { currentSailFailures } from './current-sail.check';

describe('current sail configuration', () => {
  it('lists plan choices and compares them loosely', () => {
    expect(currentSailFailures()).toEqual([]);
  });
});
