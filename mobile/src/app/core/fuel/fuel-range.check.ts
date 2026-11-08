import { knotsFromMps } from '../logbook/logbook-math';
import { emptyFuelMotion, enginesInOrder, ingestFuelMotion } from './fuel-motion';
import {
  CRUISE_RPM,
  RUNNING_RPM,
  emptyFuelCurve,
  engineFuelLph,
  fuelCurveError,
  fuelCurveFromText,
  fuelCurveIdleNote,
  fuelCurveSummary,
  fuelExponent,
  fuelRangeView,
  remainingFuelLitres,
  totalFuelLph,
  FuelCurveSettings,
} from './fuel-range';

export function fuelRangeFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const near = (actual: number | null, expected: number, message: string) => {
    expect(actual != null && Math.abs(actual - expected) < 1e-6, `${message} (got ${actual})`);
  };

  const curve: FuelCurveSettings = {
    maxRpm: 3600,
    maxFuelLph: 30,
    cruiseFuelLph: 12,
    engineCount: 2,
    idleFuelLph: 2,
  };
  const expectedExponent = Math.log(30 / 12) / Math.log(3600 / CRUISE_RPM);
  near(fuelExponent(curve), expectedExponent, 'exponent uses the max and 2,000 rpm chart points');
  near(engineFuelLph(3600, curve, expectedExponent), 30, 'max rpm lands on the max chart point');
  near(engineFuelLph(CRUISE_RPM, curve, expectedExponent), 12, '2,000 rpm lands on the cruise chart point');
  expect(engineFuelLph(null, curve, expectedExponent) == null, 'a missing tach is unknown');
  expect(engineFuelLph(RUNNING_RPM - 1, curve, expectedExponent) === 0, 'an engine under the running threshold is stopped');

  const low = engineFuelLph(RUNNING_RPM, curve, expectedExponent);
  const rawLow = 30 * (RUNNING_RPM / 3600) ** expectedExponent;
  expect(rawLow < 2 && low === 2, `idle is a floor under the cruise figure (raw ${rawLow}, got ${low})`);
  expect(fuelCurveIdleNote({ ...curve, idleFuelLph: 12 }) === 'Idle fuel is left unused unless it is below the 2,000 RPM figure.', 'idle at the cruise figure is called out');
  expect(fuelCurveIdleNote(curve) === '', 'a usable idle stays quiet');

  near(
    totalFuelLph([{ id: 'port', rpm: 2000 }, { id: 'starboard', rpm: 3600 }], curve),
    42,
    'each engine uses its own rpm',
  );
  near(
    totalFuelLph([{ id: 'main', rpm: 2000 }], curve),
    24,
    'one published rpm is applied to every engine',
  );
  expect(
    totalFuelLph([{ id: 'port', rpm: 0 }, { id: 'starboard', rpm: 0 }], curve) === 0,
    'stopped engines burn nothing',
  );
  expect(totalFuelLph([], curve) == null, 'no engines means rpm has not arrived');
  near(
    totalFuelLph([{ id: 'port', rpm: null }, { id: 'starboard', rpm: 2000 }], curve),
    12,
    'a second engine with no tach yet is left out of the sum',
  );

  const flat: FuelCurveSettings = {
    maxRpm: 3000,
    maxFuelLph: 10,
    cruiseFuelLph: 10,
    engineCount: 1,
    idleFuelLph: null,
  };
  expect(fuelExponent(flat) === 0, 'equal chart points give a flat curve');
  expect(engineFuelLph(2200, flat, 0) === 10, 'a flat curve holds the chart burn at any running rpm');

  expect(fuelExponent({ ...curve, maxRpm: CRUISE_RPM }) == null, 'max rpm must be above 2,000');
  expect(fuelExponent({ ...curve, cruiseFuelLph: 40 }) == null, 'cruise fuel above max fuel is not a rising curve');
  expect(fuelExponent({ ...curve, engineCount: null }) === expectedExponent, 'the exponent does not need the engine count');
  expect(totalFuelLph([{ id: 'main', rpm: 2000 }], { ...curve, engineCount: null }) == null, 'the total waits for an engine count');

  expect(remainingFuelLitres([
    { kind: 'fuel', level: 0.5, capacityM3: 0.4 },
    { kind: 'fuel', level: 1, capacityM3: null },
    { kind: 'freshWater', level: 1, capacityM3: 0.2 },
  ]) === 200, 'only fuel tanks with a level and a capacity count');
  expect(remainingFuelLitres([{ kind: 'fuel', level: 0.5, capacityM3: null }]) == null, 'a tank without capacity cannot give litres');

  const ready = fuelRangeView({
    curve: { ...curve, engineCount: 1, idleFuelLph: null },
    engines: [{ id: 'main', rpm: 3600 }],
    sogKn: 5,
    tanks: [{ kind: 'fuel', level: 0.5, capacityM3: 0.4 }],
  });
  expect(ready.status === 'ready' && ready.hours === '6.7 h' && ready.distance === '33 nm', `ready range (got ${ready.status}, ${ready.hours}, ${ready.distance})`);
  expect(ready.burn === '30 L/h' && ready.remaining === '200 L' && ready.speed === '5.0 kn', `ready detail (got ${ready.burn}, ${ready.remaining}, ${ready.speed})`);

  const hoursOnly = fuelRangeView({
    curve: { ...curve, engineCount: 1, idleFuelLph: null },
    engines: [{ id: 'main', rpm: 3600 }],
    sogKn: null,
    tanks: [{ kind: 'fuel', level: 0.5, capacityM3: 0.4 }],
  });
  expect(hoursOnly.hours === '6.7 h' && hoursOnly.distance === '—' && hoursOnly.note.includes('speed'), 'hours stand without speed over ground');

  const still = fuelRangeView({
    curve: { ...curve, engineCount: 1, idleFuelLph: null },
    engines: [{ id: 'main', rpm: 3600 }],
    sogKn: 0,
    tanks: [{ kind: 'fuel', level: 0.5, capacityM3: 0.4 }],
  });
  expect(still.distance === '—' && still.note === 'Not moving.', 'a stopped boat does not invent a distance');

  const stopped = fuelRangeView({
    curve,
    engines: [{ id: 'port', rpm: 0 }, { id: 'starboard', rpm: 0 }],
    sogKn: 6,
    tanks: [{ kind: 'fuel', level: 0.5, capacityM3: 0.4 }],
  });
  expect(stopped.status === 'stopped' && stopped.hours === '—' && stopped.burn === '0 L/h', 'stopped engines leave the range blank');

  expect(fuelRangeView({
    curve: emptyFuelCurve(),
    engines: [{ id: 'main', rpm: 1800 }],
    sogKn: 5,
    tanks: [{ kind: 'fuel', level: 1, capacityM3: 0.2 }],
  }).status === 'needs-settings', 'an empty curve asks for settings');
  expect(fuelRangeView({
    curve,
    engines: [{ id: 'main', rpm: 1800 }],
    sogKn: 5,
    tanks: [],
  }).status === 'needs-fuel', 'the range waits for a fuel quantity');
  expect(fuelRangeView({
    curve,
    engines: [],
    sogKn: 5,
    tanks: [{ kind: 'fuel', level: 1, capacityM3: 0.2 }],
  }).status === 'needs-rpm', 'the range waits for rpm');
  expect(fuelRangeView({
    curve,
    engines: [{ id: 'port', rpm: 0 }, { id: 'starboard', rpm: null }],
    sogKn: 5,
    tanks: [{ kind: 'fuel', level: 1, capacityM3: 0.2 }],
  }).status === 'needs-rpm', 'one stopped engine does not hide a missing tach');

  const short = fuelRangeView({
    curve: { ...curve, engineCount: 1, idleFuelLph: null, maxFuelLph: 200, cruiseFuelLph: 200 },
    engines: [{ id: 'main', rpm: 3000 }],
    sogKn: 4,
    tanks: [{ kind: 'fuel', level: 1, capacityM3: 0.1 }],
  });
  expect(short.hours === '30 min' && short.distance === '2 nm', `under an hour is shown in minutes (got ${short.hours}, ${short.distance})`);

  const fields = fuelCurveFromText({
    maxRpm: '3600',
    maxFuelLph: '30',
    cruiseFuelLph: '12,5',
    engineCount: '2',
    idleFuelLph: '',
  });
  expect(fields.maxRpm === 3600 && fields.cruiseFuelLph === 12.5 && fields.engineCount === 2 && fields.idleFuelLph == null, 'settings text accepts a comma decimal and a blank idle');
  expect(fuelCurveError({
    maxRpm: '1800',
    maxFuelLph: '30',
    cruiseFuelLph: '12',
    engineCount: '2',
    idleFuelLph: '',
  }).includes('above 2,000'), 'a low max rpm is explained');
  expect(fuelCurveSummary(curve).startsWith('Exponent '), `a valid curve previews the exponent (got ${fuelCurveSummary(curve)})`);

  const motion = emptyFuelMotion();
  ingestFuelMotion(motion, 'propulsion.port.revolutions', 30);
  ingestFuelMotion(motion, 'self.propulsion.starboard.revolutions', 1800);
  ingestFuelMotion(motion, 'propulsion.bowThruster.revolutions', 20);
  ingestFuelMotion(motion, 'vessels.urn:mrn:signalk:uuid:abc.navigation.speedOverGround', 2);
  ingestFuelMotion(motion, 'propulsion.0', { revolutions: 10 });
  const ordered = enginesInOrder(motion.engines);
  expect(ordered.map((engine) => engine.id).join(',') === '0,port,starboard', `engine order (got ${ordered.map((engine) => engine.id).join(',')})`);
  expect(ordered[0].rpm === 600 && ordered[1].rpm === 1800 && ordered[2].rpm === 1800, 'hertz and rpm both become rpm, and a thruster is left out');
  near(motion.sogKn, knotsFromMps(2), 'speed over ground is stored in knots');
  expect(!ingestFuelMotion(motion, 'navigation.speedOverGround', 2), 'the same speed does not count as a change');
  expect(!ingestFuelMotion(motion, 'propulsion.extra.revolutions', null), 'a clear for an unseen engine does not invent one');
  ingestFuelMotion(motion, 'propulsion.port.revolutions', null);
  expect(motion.engines.find((engine) => engine.id === 'port')?.rpm == null, 'a later clear drops that engine rpm');

  return failures;
}
