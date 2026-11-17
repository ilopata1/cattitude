import { angleDeltaDeg, signedAngleDeltaDeg, unwrapAngleDeg } from '../../../instruments/skip/wind-steer.util';
import {
  arcDashOffset,
  arcFraction,
  arcZonePath,
  compassCogPoints,
  compassTicks,
  displayHeadingDeg,
  formatGaugeValue,
  levelFillWidth,
  levelZoneRect,
  sparklineLayout,
  windSide,
} from './viz-geometry';

export function vizGeometryFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const near = (actual: number, expected: number, message: string) => {
    expect(Math.abs(actual - expected) < 1e-6, `${message} (got ${actual})`);
  };

  near(signedAngleDeltaDeg(359, 1), 2, '359° to 1° is a short turn of +2°');
  near(signedAngleDeltaDeg(1, 359), -2, '1° to 359° is a short turn of −2°');
  near(signedAngleDeltaDeg(10, 20), 10, 'a small increase stays positive');
  near(signedAngleDeltaDeg(720, 10), 10, 'an unwrapped heading still takes the short turn');
  near(unwrapAngleDeg(359, 1), 361, 'unwrapping continues past 360 instead of jumping to 1');
  near(unwrapAngleDeg(720, 10), 730, 'unwrapping keeps the accumulated turn');
  near(angleDeltaDeg(359, 1), 2, 'the absolute Skip delta is unchanged');

  near(arcFraction(50, 0, 100), 0.5, 'mid scale is half the arc');
  near(arcFraction(-5, 0, 100), 0, 'below the scale is empty');
  near(arcFraction(140, 0, 100), 1, 'above the scale is full');
  near(arcFraction(1, 5, 5), 0, 'a zero span does not divide');
  near(arcDashOffset(0, 100), 100, 'an empty arc hides the whole dash');
  near(arcDashOffset(1, 100), 0, 'a full arc shows the whole dash');
  expect(formatGaugeValue(72) === '72', 'a whole gauge value has no decimal');
  expect(formatGaugeValue(72.44) === '72.4', 'a gauge value keeps one decimal');
  expect(formatGaugeValue(Number.NaN) === '—', 'a missing gauge value is an em dash');

  const zone = arcZonePath(0, 25, 0, 100);
  expect(zone != null && zone.startsWith('M '), 'a warning zone is an arc path');
  expect(arcZonePath(40, 40, 0, 100) == null, 'a zero-width zone draws nothing');

  const empty = sparklineLayout([], null, null);
  expect(empty.line === '' && empty.dot == null, 'no samples draw nothing');
  const rising = sparklineLayout([0, 10], 0, 10);
  const [start, end] = rising.line.split(' ');
  expect(Number(end.split(',')[1]) < Number(start.split(',')[1]), 'a rising trace climbs the box');
  expect(rising.dot != null && rising.dot.x === 100, 'the dot sits on the latest sample');
  const flat = sparklineLayout([5, 5], null, null);
  expect(flat.dot != null && Math.abs(flat.dot.y - 14) < 0.01, 'a flat trace sits on the midline');
  const clipped = sparklineLayout([0, 10], 0, 100);
  expect(clipped.dot != null && clipped.dot.y > 20, 'a caller max keeps a small value low');

  expect(levelFillWidth(null) == null, 'an unknown level draws no fill');
  near(levelFillWidth(0) ?? -1, 0, 'an empty tank still has a fill of zero');
  near(levelFillWidth(140) ?? -1, 100, 'a level fill caps at 100');
  near(levelFillWidth(-4) ?? -1, 0, 'a level fill floors at 0');
  const alarm = levelZoneRect({ from: 0, to: 20, tone: 'alarm' });
  expect(alarm != null && alarm.x === 0 && alarm.width === 20, 'a low zone sits at the start of the bar');

  const north = compassTicks().find(tick => tick.bearing === 0);
  const east = compassTicks().find(tick => tick.bearing === 90);
  expect(north != null && north.label === 'N' && north.x2 === 100 && north.y2 < north.y1, 'north is at the top of the card');
  expect(east != null && east.label === 'E' && east.x2 > 100, 'east is on the right of the card');
  const cog = compassCogPoints(0).split(' ')[0];
  expect(Number(cog.split(',')[1]) < 100, 'the cog mark for north sits above the centre');

  expect(windSide(90) === 'starboard', 'apparent wind on the right is starboard');
  expect(windSide(270) === 'port', 'apparent wind on the left is port');
  expect(windSide(0) === 'ahead', 'wind on the bow is neither side');
  expect(displayHeadingDeg(359.6) === '0', 'a heading just below 360 displays as 0');
  expect(displayHeadingDeg(247.2) === '247', 'a heading displays as whole degrees');
  expect(displayHeadingDeg(Number.NaN) === '—', 'a missing heading is an em dash');

  return failures;
}
