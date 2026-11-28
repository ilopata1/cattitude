import { EMPTY_WIND_STEER, WindSteerLive } from '../models/instrument-map.model';
import {
  bearingUnit,
  displayBearing,
  displayCompass,
  formatBearing,
  pathBearingRef,
} from './magnetic';

export function magneticFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const near = (actual: number | null, expected: number, message: string) => {
    expect(actual != null && Math.abs(actual - expected) < 1e-9, `${message} (got ${actual})`);
  };

  expect(pathBearingRef('self.navigation.headingTrue') === 'true', 'headingTrue is true');
  expect(pathBearingRef('self.navigation.headingMagnetic') === 'magnetic', 'headingMagnetic is magnetic');
  expect(pathBearingRef('navigation.courseOverGroundMagnetic') === 'magnetic', 'COG magnetic is magnetic');
  expect(pathBearingRef(undefined) === 'true', 'an unmapped path is taken as true');

  // Signal K variation is east positive: magnetic = true − variation.
  near(displayBearing(100, 'true', 10).deg, 90, '10° east takes 10° off');
  near(displayBearing(100, 'true', -8).deg, 108, '8° west adds 8°');
  near(displayBearing(5, 'true', 10).deg, 355, 'magnetic wraps below north');
  expect(displayBearing(100, 'true', 10).ref === 'magnetic', 'a converted bearing is magnetic');
  expect(displayBearing(100, 'true', null).ref === 'true', 'without variation a true bearing stays true');
  near(displayBearing(100, 'magnetic', 10).deg, 100, 'a magnetic bearing is not shifted again');

  expect(bearingUnit('magnetic') === '°M' && bearingUnit('true') === '°T', 'units name the north');
  expect(formatBearing(247.4, 'true', 2, true) === '245°M', 'heading reads as whole magnetic degrees');
  expect(formatBearing(247.4, 'true', null, true) === '247°T', 'no variation reads as °T, not °M');
  expect(formatBearing(0.3, 'true', 0.5, true) === '0°M', 'just below north reads 0, not 360');
  expect(formatBearing(247, 'true', 2, false) === '—', 'a stale reading is an em dash');

  const wind = (over: Partial<WindSteerLive>): WindSteerLive => ({
    ...EMPTY_WIND_STEER, heading: 100, cog: 110, twa: 140, ...over,
  });

  const shifted = displayCompass(wind({ variation: -12 }));
  expect(shifted.ref === 'magnetic', 'the card is magnetic when variation is known');
  near(shifted.heading, 112, 'card heading is magnetic');
  near(shifted.cog, 122, 'card COG is magnetic');
  near(shifted.twd, 152, 'card wind direction is magnetic');
  near(
    (shifted.twd! - shifted.heading + 360) % 360,
    40,
    'wind off the bow is unchanged, so laylines do not move',
  );

  const plain = displayCompass(wind({ variation: null }));
  expect(plain.ref === 'true' && plain.heading === 100 && plain.cog === 110 && plain.twd === 140,
    'without variation the card stays true');

  const compassOnly = displayCompass(wind({ headingRef: 'magnetic', variation: null }));
  expect(compassOnly.ref === 'magnetic', 'a magnetic heading path keeps the card magnetic');
  expect(compassOnly.cog === null, 'a true COG that cannot be converted is left off a magnetic card');
  near(compassOnly.twd, 140, 'wind worked out from a magnetic heading is already magnetic');

  const mixed = displayCompass(wind({ headingRef: 'magnetic', cogRef: 'true', variation: 5 }));
  near(mixed.heading, 100, 'a magnetic heading is not shifted');
  near(mixed.cog, 105, 'a true COG joins a magnetic card');

  return failures;
}
