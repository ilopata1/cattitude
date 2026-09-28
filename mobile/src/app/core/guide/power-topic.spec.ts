import { powerTopicFailures } from './power-topic.check';

describe('power topic', () => {
  it('groups electrical, controls, and batteries into one topic', () => {
    expect(powerTopicFailures()).toEqual([]);
  });
});
