import { AB_SETTLE_MS, AbSample, AbSession, abArchiveFacts, emptySession } from '../ab-test/ab-test';
import { DutyRota } from '../duty/duty-rota';
import { CoachSnapshot } from './coach.model';
import {
  CoachAbRecord,
  CoachSummary,
  abEvidenceText,
  coachAbRecord,
  keepSummaries,
  matchingAbRecord,
  prunePassages,
  rememberPassage,
  sinceWatchLine,
  summaryDue,
  summaryFromSnapshot,
  summaryHasFacts,
  vmgGainPct,
  watchStartedAt,
} from './coach-memory';
import { COACH_SUMMARY_MS, COACH_SUMMARY_RETAIN_MS } from './coach-settings';

export function coachMemoryFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean | undefined, message: string) => {
    if (!condition) failures.push(message);
  };

  const recent = record({ finishedAt: 200, meanTwsKn: 14, meanTwaDeg: 60 });
  const older = record({ id: 'older', finishedAt: 100, meanTwsKn: 14, meanTwaDeg: 60 });
  expect(matchingAbRecord(17, 60, [older, recent])?.id === recent.id, 'exactly 3 kn still matches, and the newer test wins');
  expect(matchingAbRecord(18, 60, [recent]) == null, '4 kn is outside the wind window');
  expect(matchingAbRecord(14, 75, [recent])?.id === recent.id, 'exactly 15 degrees still matches');
  expect(matchingAbRecord(14, 76, [recent]) == null, '16 degrees is outside the angle window');
  expect(matchingAbRecord(14, 5, [record({ meanTwaDeg: 350 })])?.id === 'test', '15 degrees the other way around the circle still matches');
  expect(abEvidenceText(recent)?.includes('B (traveller down) beat A by 10% VMG at 70% confidence') === true, '70% confidence is quoted');
  expect(abEvidenceText(record({ vmgConfidencePct: 69 })) == null, '69% confidence is not quoted');
  expect(abEvidenceText(record({ vmgWinner: 'A', vmgDeltaPct: -10 })) == null, 'a win for A is not rewritten as a win for B');
  expect(abEvidenceText(record({ vmgDeltaPct: 0 })) == null, 'a rounded gain of zero stays quiet');
  expect(vmgGainPct(80, 88) === 10, `relative VMG gain should be 10, got ${vmgGainPct(80, 88)}`);
  expect(vmgGainPct(0, 10) == null, 'a zero baseline has no percent');

  expect(summaryDue(null, 1), 'the first summary is due');
  expect(summaryDue(0, COACH_SUMMARY_MS), 'a summary is due on the exact interval');
  expect(!summaryDue(0, COACH_SUMMARY_MS - 1), 'a summary waits inside the interval');

  const blank: CoachSummary = {
    at: 1, passageId: null, twsKn: null, twaDeg: null, polarPct: null,
    helmDeg: null, rudderSdDeg: null, hsM: null, tpS: null, sailsUp: '  ',
  };
  expect(!summaryHasFacts(blank), 'an empty summary is not stored');
  const taken = summaryFromSnapshot({
    builtAt: 5,
    wind: { tws: { mean: 12 }, twa: { mean: 40 } },
    performance: { polarPct: { 30: 88 } },
    helm: { weatherHelmDeg: { mean: 3 }, rudderSdDeg: 4 },
    waves: { estimate: { hs: 1.2, tpTrue: 7 } },
    sails: { up: 'jib' },
  } as CoachSnapshot, 'passage');
  expect(taken.twsKn === 12 && taken.polarPct === 88 && taken.hsM === 1.2 && taken.sailsUp === 'jib', 'a summary copies the snapshot means');

  const week = COACH_SUMMARY_RETAIN_MS;
  const now = 100 * week;
  const open = summary({ at: now - 30 * 86_400_000, passageId: 'open' });
  const fresh = summary({ at: now, passageId: 'done' });
  const ended = summary({ at: now - 20 * 86_400_000, passageId: 'old' });
  const stray = summary({ at: now - week - 1, passageId: null });
  const passages = [
    { id: 'open', arrivedAtMs: null },
    { id: 'done', arrivedAtMs: now - 86_400_000 },
    { id: 'old', arrivedAtMs: now - week - 1 },
  ];
  const kept = keepSummaries([open, fresh, ended, stray], passages, now);
  expect(kept.some(row => row.passageId === 'open'), 'an open passage keeps its older summaries');
  expect(kept.some(row => row.passageId === 'done'), 'a passage stays for seven days after arrival');
  expect(!kept.some(row => row.passageId === 'old'), 'a passage drops once seven days have passed');
  expect(!kept.some(row => row.passageId == null), 'a summary with no passage drops after seven days');
  const boundary = keepSummaries(
    [summary({ at: 1, passageId: 'edge' })],
    [{ id: 'edge', arrivedAtMs: now - week }],
    now,
  );
  expect(boundary.length === 1, 'the seventh day itself is still kept');
  expect(prunePassages(passages, now).some(item => item.id === 'open') && !prunePassages(passages, now).some(item => item.id === 'old'), 'remembered passages follow the same cutoff');

  const closed = rememberPassage([{ id: 'a', arrivedAtMs: null }], { id: 'b', arrivedAt: null }, 50);
  expect(closed.find(item => item.id === 'a')?.arrivedAtMs === 50, 'a new passage closes the previous one');
  expect(closed.find(item => item.id === 'b')?.arrivedAtMs == null, 'the passage now underway stays open');

  const start = Date.UTC(2026, 5, 21, 12, 0);
  const at = Date.UTC(2026, 5, 21, 13, 0);
  expect(watchStartedAt(rota(), at) === start, `the current watch starts at 12:00, got ${watchStartedAt(rota(), at)}`);
  const early = summary({ at: start + 60_000, twsKn: 10, polarPct: 90, helmDeg: 2, hsM: 1, sailsUp: 'full main' });
  const late = summary({ at: start + 120_000, twsKn: 14, polarPct: 91, helmDeg: 5, hsM: 1.2, sailsUp: 'reefed main' });
  const line = sinceWatchLine([late, early], start, late.at);
  expect(line === 'Since the last watch: TWS up 4 kn, polar percent from 90 to 91, helm from 2° to 5°, wave height from 1.0 m to 1.2 m, sails changed from full main to reefed main.', `since-watch line was ${line}`);
  expect(sinceWatchLine([early], start, early.at) == null, 'one sample is not a change');
  expect(sinceWatchLine([early, { ...early, at: early.at + 1 }], start, early.at + 1) == null, 'an unchanged watch stays quiet');

  const archived = coachAbRecord(scoredSession(), 1);
  expect(archived?.meanTwsKn === 12 && archived.meanTwaDeg === 60, `archive means should be 12 kn and 60°, got ${archived?.meanTwsKn} / ${archived?.meanTwaDeg}`);
  expect(abArchiveFacts(emptySession()) == null, 'an unfinished test has no archive facts');

  return failures;
}

function record(partial: Partial<CoachAbRecord> = {}): CoachAbRecord {
  return {
    id: 'test',
    finishedAt: 1,
    settingA: 'traveller up',
    settingB: 'traveller down',
    meanTwsKn: 14,
    meanTwaDeg: 60,
    vmgWinner: 'B',
    vmgConfidencePct: 70,
    vmgDeltaPct: 10,
    ...partial,
  };
}

function summary(partial: Partial<CoachSummary> = {}): CoachSummary {
  return {
    at: 1,
    passageId: 'p',
    twsKn: 10,
    twaDeg: 60,
    polarPct: 90,
    helmDeg: 2,
    rudderSdDeg: 1,
    hsM: 1,
    tpS: 6,
    sailsUp: 'full main',
    ...partial,
  };
}

function rota(): DutyRota {
  return {
    startAt: '2026-06-21T12:00',
    crew: [{ id: 'sam', name: 'Sam' }],
    tasks: [{ id: 'watch', name: 'Watch', intervalHours: 4, sequence: ['sam'] }],
    updatedAt: '',
  };
}

function scoredSession(): AbSession {
  const session = emptySession();
  session.setup.settingA = 'traveller up';
  session.setup.settingB = 'traveller down';
  session.legs = [
    { id: 'A', cycle: 1, startedAt: 10, samples: wind(10, 50), alarms: [], imu: [] },
    { id: 'B', cycle: 1, startedAt: 20, samples: wind(14, 70), alarms: [], imu: [] },
  ];
  return session;
}

function wind(twsKn: number, twaDeg: number): AbSample[] {
  const samples: AbSample[] = [];
  for (let i = 0; i < 5; i += 1) {
    samples.push({
      tOffsetMs: AB_SETTLE_MS + i * 1000,
      twsKn,
      twdDeg: null,
      stwKn: null,
      sogKn: null,
      headingDeg: null,
      cogDeg: null,
      twaDeg,
      signedTwaDeg: twaDeg,
      rudderDeg: null,
      targetKn: null,
      vmgSpeedKn: null,
      vmgSpeedSource: null,
      pitchRad: null,
      rollRad: null,
      heaveM: null,
      vertAccel: null,
      windMissing: false,
      speedMissing: false,
      attitudeMissing: false,
    });
  }
  return samples;
}
