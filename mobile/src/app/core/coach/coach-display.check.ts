import { sanitizeRota } from '../duty/duty-rota';
import { parseWall } from '../wall-time';
import { solarElevationDeg } from './coach-features';
import { CoachFinding } from './coach.model';
import {
  COACH_BRIEF_HOLD_MS,
  COACH_NIGHT_ELEVATION_MAX_DEG,
  COACH_REBUILD_MIN_MS,
} from './coach-settings';
import {
  briefMayRefresh,
  coachPreview,
  decideCoachPush,
  handoverBrief,
  handoverDue,
  minutesUntilNight,
  nextWatchChange,
  rebuildMayRun,
} from './coach-display';

export function coachDisplayFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };
  const now = Date.UTC(2026, 5, 21, 12, 0, 0);

  expect(briefMayRefresh(null, now), 'the first briefing is allowed');
  expect(!briefMayRefresh({ generatedAt: now }, now + COACH_BRIEF_HOLD_MS - 1), 'inside the window the same text stays');
  expect(briefMayRefresh({ generatedAt: now }, now + COACH_BRIEF_HOLD_MS), 'the window ending allows a new briefing');
  expect(!rebuildMayRun(now, now + COACH_REBUILD_MIN_MS - 1), 'background rebuilds wait a minute');
  expect(rebuildMayRun(null, now), 'the first background rebuild is allowed');

  const less = finding('sails.reef', 'action', 'less-sail');
  const same = finding('sails.same', 'action', 'same');
  const first = decideCoachPush([less, same], new Set());
  expect(first.notify.map(item => item.id).join(',') === 'sails.reef', 'only a less-sail action notifies');
  const again = decideCoachPush([less], new Set(first.open));
  expect(again.notify.length === 0 && again.open.join(',') === 'sails.reef', 'the same finding stays quiet until it clears');
  const cleared = decideCoachPush([], new Set(again.open));
  expect(cleared.open.length === 0, 'a cleared finding is forgotten');
  const returned = decideCoachPush([less], new Set(cleared.open));
  expect(returned.notify.length === 1, 'the finding can notify again after it clears');

  const text = [
    '14:20 · 30 min window · data OK',
    'BOTTOM LINE\n1. Reef.',
    'SAIL PLAN  Main.',
    'NEXT 1–3 H Later.',
    'DOWNWIND   Surfs.',
    'CAVEATS  Gap.',
  ].join('\n\n');
  const preview = coachPreview(text);
  expect(preview.header.startsWith('14:20'), 'the header is the first line');
  expect(preview.bottom.startsWith('BOTTOM LINE'), 'the collapsed card is the bottom line');
  const handover = handoverBrief(text);
  expect(handover.includes('SAIL PLAN') && handover.includes('DOWNWIND'), 'the handover keeps sail plan and downwind');
  expect(!handover.includes('NEXT') && !handover.includes('CAVEATS'), 'the handover leaves out later sections');
  expect(handoverDue(20) && !handoverDue(21) && !handoverDue(null), 'handover starts at the twenty-minute mark');

  expect(minutesUntilNight(null, now) == null, 'no position is not night');
  const midnight = Date.UTC(2026, 5, 21, 0, 0, 0);
  expect(minutesUntilNight({ lat: 50, lon: 0 }, midnight) === 0, 'a night position is already night');
  expect(
    solarElevationDeg(50, 0, now) >= COACH_NIGHT_ELEVATION_MAX_DEG,
    'the noon used below is still day',
  );
  const untilDark = minutesUntilNight({ lat: 50, lon: 0 }, now);
  expect(untilDark != null && untilDark > 0, 'daytime reports the minutes until night');

  const start = '2026-11-12T12:00';
  const startMs = parseWall(start)!;
  const rota = sanitizeRota({
    startAt: start,
    crew: [
      { id: 'sam', name: 'Sam' },
      { id: 'jo', name: 'Jo' },
    ],
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4 }],
  });
  const watch = nextWatchChange(rota, startMs);
  expect(watch?.name === 'Jo' && watch.minutes === 240, `the next watch is Jo in 240 min, got ${watch?.name} ${watch?.minutes}`);
  expect(nextWatchChange(sanitizeRota({}), startMs) == null, 'a rota with nobody on watch has no handover');

  return failures;
}

function finding(
  id: string,
  severity: CoachFinding['severity'],
  direction: CoachFinding['direction'],
): CoachFinding {
  return {
    id,
    section: 'sails',
    severity,
    confidence: 'high',
    text: id,
    evidence: {},
    requires: [],
    direction,
  };
}
