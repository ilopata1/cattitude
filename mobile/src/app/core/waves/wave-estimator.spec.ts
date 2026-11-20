import { waveEstimatorFailures } from './wave-estimator.check';

describe('wave estimator', () => {
  it('recovers height, period, and direction on synthetic seas', () => {
    expect(waveEstimatorFailures()).toEqual([]);
  });
});
