import { coachFeatureFailures } from './coach-features.check';

describe('coach features', () => {
  it('derives helm, surf, residual, trend, and cutover numbers', () => {
    expect(coachFeatureFailures()).toEqual([]);
  });
});
