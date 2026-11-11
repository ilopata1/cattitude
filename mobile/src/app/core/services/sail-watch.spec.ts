import { sailWatchFailures } from './sail-watch.check';

describe('Sail watch windows', () => {
  it('notifies each covered window on its own', () => {
    expect(sailWatchFailures()).toEqual([]);
  });
});
