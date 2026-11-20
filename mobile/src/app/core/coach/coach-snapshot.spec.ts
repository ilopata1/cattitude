import { coachSnapshotFailures } from './coach-snapshot.check';

describe('coach snapshot', () => {
  it('builds exact numbers and leaves gaps null', () => {
    expect(coachSnapshotFailures()).toEqual([]);
  });
});
