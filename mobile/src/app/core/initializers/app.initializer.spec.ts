import { fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { appInitializer } from './app.initializer';
import { InstrumentMapService } from '../services/instrument-map.service';
import { SailPlanService } from '../services/sail-plan.service';

describe('appInitializer', () => {
  it('starts sail plans and instrument maps without waiting on the network', fakeAsync(() => {
    const sailPlans = jasmine.createSpyObj<SailPlanService>('SailPlanService', ['ensureLoaded']);
    sailPlans.ensureLoaded.and.returnValue(new Promise(() => undefined));
    const instrumentMaps = jasmine.createSpyObj<InstrumentMapService>('InstrumentMapService', [
      'ensureLoaded',
    ]);
    instrumentMaps.ensureLoaded.and.returnValue(new Promise(() => undefined));

    let finished = false;
    void appInitializer(sailPlans, instrumentMaps)().then(() => {
      finished = true;
    });
    flushMicrotasks();

    expect(finished).toBeTrue();
    expect(sailPlans.ensureLoaded).toHaveBeenCalled();
    expect(instrumentMaps.ensureLoaded).toHaveBeenCalled();
  }));
});
