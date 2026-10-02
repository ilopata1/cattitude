import { emptyReading, Passage, TrackSample } from '../models/logbook.model';
import { logbookToCsv, logbookToGpx } from './logbook-export';
import { enginesRunning, ingestSignalK } from './logbook-ingest';
import {
  anchoringPauseActive,
  bearingDeg,
  beaufortFromKnots,
  derivePropulsion,
  destinationDistanceNm,
  etaIso,
  formatPosition,
  haversineNm,
  intervalDue,
  latestSlotMs,
  pressureHpa,
  propulsionTriggerFor,
  rpmFromRevolutions,
  summarizeTrack,
  temperatureC,
  vmgKnots,
} from './logbook-math';
import { LogEntry } from '../models/logbook.model';

export function logbookMathFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) failures.push(message);
  };

  const equator = haversineNm({ lat: 0, lon: 0 }, { lat: 0, lon: 1 });
  expect(Math.abs(equator - 60.04) < 0.2, `one degree of longitude at the equator is about 60 nm, got ${equator}`);
  expect(Math.abs(bearingDeg({ lat: 0, lon: 0 }, { lat: 1, lon: 0 }) - 0) < 0.1, 'north bearing');
  expect(formatPosition(24.52, -64.21333) === "24°31.2'N  064°12.8'W", `position format ${formatPosition(24.52, -64.21333)}`);
  expect(beaufortFromKnots(18) === 5, '18 kn is force 5');
  expect(beaufortFromKnots(0.2) === 0, 'calm');
  expect(pressureHpa(101325) === 1013.3, `pascals to hPa, got ${pressureHpa(101325)}`);
  expect(pressureHpa(1013) === 1013, 'hPa passthrough');
  expect(temperatureC(293.15) === 20, 'kelvin to C');
  expect(temperatureC(20) === 20, 'celsius passthrough');
  expect(rpmFromRevolutions(10) === 600, '10 Hz is 600 rpm');
  expect(rpmFromRevolutions(1800) === 1800, 'already rpm');

  expect(derivePropulsion({ navState: 'moored', enginesRunning: true, sailsUp: false, sogKn: 0 }) === 'anchored', 'moored');
  expect(derivePropulsion({ navState: null, enginesRunning: true, sailsUp: true, sogKn: 6 }) === 'motor-sailing', 'motor sailing');
  expect(derivePropulsion({ navState: null, enginesRunning: true, sailsUp: false, sogKn: 6 }) === 'motoring', 'motoring');
  expect(derivePropulsion({ navState: null, enginesRunning: false, sailsUp: true, sogKn: 6 }) === 'sailing', 'sailing');
  expect(derivePropulsion({ navState: null, enginesRunning: false, sailsUp: false, sogKn: 0 }) === 'stopped', 'stopped');

  const midnight = Date.UTC(2026, 9, 2, 0, 0, 0);
  expect(latestSlotMs(Date.UTC(2026, 9, 2, 7, 30), 6, 0) === midnight + 6 * 3_600_000, '6 h slot at 06:00');
  expect(latestSlotMs(Date.UTC(2026, 9, 2, 4, 0), 3, 120) === Date.UTC(2026, 9, 2, 2, 0), '3 h offset 02:00');
  expect(intervalDue(Date.UTC(2026, 9, 2, 6, 1), Date.UTC(2026, 9, 2, 0, 5), 6, 0), 'interval due after 06:00');
  expect(!intervalDue(Date.UTC(2026, 9, 2, 6, 1), Date.UTC(2026, 9, 2, 6, 0), 6, 0), 'interval not due twice');
  expect(anchoringPauseActive('anchored', 0, ANCHOR, true), 'pause after 15 min anchored');
  expect(!anchoringPauseActive('sailing', 0, ANCHOR, true), 'sailing does not pause');

  const samples: TrackSample[] = [
    { at: 0, lat: 0, lon: 0, twsKn: 10, pressureHpa: 1016, tripLogM: 0, sogKn: 6 },
    { at: 3_600_000, lat: 0.1, lon: 0, twsKn: 20, pressureHpa: 1014, tripLogM: 1852, sogKn: 6 },
  ];
  const summary = summarizeTrack(samples, 0, 3_600_000, 1014);
  expect(summary.meanTwsKn === 15, `mean tws ${summary.meanTwsKn}`);
  expect(summary.gustSinceKn === 20, 'gust');
  expect(summary.groundNm != null && summary.groundNm > 5, `ground distance ${summary.groundNm}`);
  expect(summary.logNm === 1, `log nm ${summary.logNm}`);

  const passage: Passage = {
    id: 'p',
    name: 'Test',
    destinationName: 'Bermuda',
    destinationLat: 32.3,
    destinationLon: -64.8,
    arrivalRadiusNm: 0.3,
    waypoints: [],
    departedAt: '2026-10-02T00:00:00.000Z',
    arrivedAt: null,
    watch: 'Ian',
    updatedAt: '2026-10-02T00:00:00.000Z',
  };
  const dtg = destinationDistanceNm({ lat: 32.3, lon: -64.8 }, passage);
  expect(dtg === 0, `dtg at destination ${dtg}`);
  expect(vmgKnots(8, 0, 0) === 8, 'vmg dead on');
  expect(etaIso(6, 6, Date.UTC(2026, 9, 2, 0, 0)) === '2026-10-02T01:00:00.000Z', 'eta');
  expect(
    propulsionTriggerFor('anchored', 'sailing', { ...passage, departedAt: null }, 100) === 'departure',
    'leaving anchor starts the passage',
  );
  expect(
    propulsionTriggerFor('sailing', 'anchored', passage, 0.1) === 'arrival',
    'anchoring inside the arrival radius',
  );
  expect(
    propulsionTriggerFor('sailing', 'motoring', passage, 40) === 'propulsion-change',
    'engine start is a propulsion change',
  );

  const reading = emptyReading();
  ingestSignalK(reading, 'navigation.position', { latitude: 1, longitude: 2 }, 1_000);
  ingestSignalK(reading, 'self.environment.wind.speedTrue', 10, 1_000);
  ingestSignalK(reading, 'propulsion.port.revolutions', 10, 1_000);
  ingestSignalK(reading, 'electrical.batteries.house.capacity.stateOfCharge', 0.84, 1_000);
  ingestSignalK(reading, 'tanks.fuel.main.currentLevel', 0.5, 1_000);
  expect(reading.position?.lat === 1, 'position ingested');
  expect(reading.twsKn != null && Math.abs(reading.twsKn - 19.4) < 0.1, `tws knots ${reading.twsKn}`);
  expect(enginesRunning(reading), '10 Hz is an engine running');
  expect(reading.batteries[0]?.soc === 0.84, 'battery soc');
  expect(reading.tanks[0]?.level === 0.5, 'fuel level');

  const entry = sampleEntry();
  const csv = logbookToCsv([entry]);
  expect(csv.includes('"squall, east"'), 'csv quotes commas');
  expect(csv.split('\n')[0].includes('time_utc'), 'csv header');
  const gpx = logbookToGpx([entry], passage);
  expect(gpx.includes('lat="24.520000"'), 'gpx point');
  expect(gpx.includes('&lt;note&gt;') === false, 'gpx escapes text');
  expect(logbookToGpx([{ ...entry, remarks: 'a < b' }], null).includes('a &lt; b'), 'gpx escapes remarks');

  return failures;
}

const ANCHOR = 15 * 60 * 1000;

function sampleEntry(): LogEntry {
  return {
    id: 'e1',
    passageId: 'p',
    at: '2026-10-02T18:00:00.000Z',
    updatedAt: '2026-10-02T18:00:00.000Z',
    zoneOffsetMin: -300,
    trigger: 'interval',
    position: { lat: 24.52, lon: -64.21333, fixAt: '2026-10-02T18:00:00.000Z' },
    headingTrueDeg: 352,
    cogDeg: 355,
    sogKn: 8.4,
    stwKn: 8.1,
    depthM: 40,
    wind: {
      twsKn: 18,
      twdDeg: 85,
      twaDeg: 40,
      awsKn: 22,
      awaDeg: 30,
      meanTwsSinceLastKn: 16,
      gustSinceLastKn: 24,
      gust10mKn: 24,
      beaufort: 5,
    },
    pressureHpa: 1014,
    pressureTrend3hHpa: -2.1,
    airTempC: 26,
    seaTempC: 27,
    current: { setDeg: null, driftKn: null },
    propulsion: { state: 'sailing', engines: [] },
    sails: { main: '1 reef', headsail: 'Solent', label: '1 reef + Solent', recommended: null },
    distances: {
      sinceLastEntryGroundNm: 24.9,
      sinceLastEntryLogNm: 24,
      sinceLastWaypointNm: 24.9,
      toDestinationNm: 412,
      cmgDeg: 354,
      smgKn: 8.3,
      vmgKn: 8.1,
      etaUtc: null,
    },
    ship: { batteries: [], tanks: [] },
    tripLogM: null,
    watch: 'Ian',
    seaState: null,
    cloudOktas: null,
    visibilityNm: null,
    remarks: 'squall, east',
    staleFields: [],
    corrections: [],
  };
}
