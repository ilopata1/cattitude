import { coachMemoryFailures } from './coach-memory.check';

describe('coach memory', () => {
  it('matches a stored test and keeps passage summaries', () => {
    expect(coachMemoryFailures()).toEqual([]);
  });
});
