import { instrumentHistoryFailures } from './instrument-history.check';

describe('instrument history', () => {
  it('keeps a short ring of fresh readings', () => {
    expect(instrumentHistoryFailures()).toEqual([]);
  });
});
