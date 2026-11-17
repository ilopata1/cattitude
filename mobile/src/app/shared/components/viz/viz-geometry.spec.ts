import { vizGeometryFailures } from './viz-geometry.check';

describe('instrument graphics', () => {
  it('lays out the sparkline, arc, level bar, and compass card', () => {
    expect(vizGeometryFailures()).toEqual([]);
  });
});
