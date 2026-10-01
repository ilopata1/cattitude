import { dashboardFailures } from './dashboard.check';

describe('home dashboard', () => {
  it('builds persona defaults and drops tiles the view cannot show', () => {
    expect(dashboardFailures()).toEqual([]);
  });
});
