import { coachDisplayFailures } from './coach-display.check';

describe('coach display', () => {
  it('holds the briefing and notifies a less-sail action once', () => {
    expect(coachDisplayFailures()).toEqual([]);
  });
});
