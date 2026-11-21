import { coachDisplayFailures } from './coach-display.check';

describe('coach display', () => {
  it('holds the briefing and does not repeat a gust warning for a new speed', () => {
    expect(coachDisplayFailures()).toEqual([]);
  });
});
