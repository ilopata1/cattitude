import { uiIconFailures } from './ui-icons.check';

describe('ui icons', () => {
  it('maps chrome pictographs to Ionicons and leaves unknown emoji', () => {
    expect(uiIconFailures()).toEqual([]);
  });
});
