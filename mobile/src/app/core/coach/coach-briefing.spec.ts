import { coachBriefingFailures } from './coach-briefing.check';

describe('coach briefing', () => {
  it('renders the worked example and stays quiet when nothing is wrong', () => {
    expect(coachBriefingFailures()).toEqual([]);
  });
});
