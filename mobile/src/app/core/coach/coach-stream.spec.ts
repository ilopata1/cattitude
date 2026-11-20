import { coachStreamFailures } from './coach-stream.check';

describe('coach stream', () => {
  it('keeps true wind, true heading, and one sample per second', () => {
    expect(coachStreamFailures()).toEqual([]);
  });
});
