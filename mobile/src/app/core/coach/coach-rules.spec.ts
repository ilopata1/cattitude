import { coachRuleFailures } from './coach-rules.check';

describe('coach rules', () => {
  it('turns a snapshot into findings and stays silent when an input is missing', () => {
    expect(coachRuleFailures()).toEqual([]);
  });
});
