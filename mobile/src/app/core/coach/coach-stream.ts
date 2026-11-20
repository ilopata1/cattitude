/**
 * Turns a Signal K delta into coach samples.
 * Apparent wind is not copied into true wind, and magnetic heading is not
 * copied into true heading. Unit conversion matches the logbook.
 */

import { combinedRudderDeg } from '../ab-test/ab-test';
import { stripVessel } from '../logbook/logbook-ingest';
import {
  angleToDegrees,
  knotsFromMps,
  signedAngleToDegrees,
} from '../logbook/logbook-math';
import { attitudeParts } from '../waves/wave-attitude';
import { CoachStreamSample } from './coach-snapshot';
import { COACH_SAMPLE_RETAIN_MS } from './coach-settings';

export interface CoachDeltaUpdate {
  timestamp?: string;
  values?: { path: string; value: unknown }[];
}

export interface CoachDeltaMessage {
  updates?: CoachDeltaUpdate[];
}

const STANDBY = /^(standby|off|manual|disengaged)$/i;

export function coachSamplesFromDelta(
  delta: CoachDeltaMessage,
  receivedAtMs: number,
): CoachStreamSample[] {
  const samples: CoachStreamSample[] = [];
  for (const update of delta.updates ?? []) {
    const sample = sampleFromUpdate(update, receivedAtMs);
    if (sample) samples.push(sample);
  }
  return samples;
}

/** One sample per second. Later fields in that second fill gaps, then replace. */
export function rememberCoachSample(
  samples: readonly CoachStreamSample[],
  next: CoachStreamSample,
  nowMs: number,
  retainMs = COACH_SAMPLE_RETAIN_MS,
): CoachStreamSample[] {
  const at = Math.floor(next.at / 1000) * 1000;
  const cutoff = nowMs - retainMs;
  if (at < cutoff) return samples.filter(sample => sample.at >= cutoff);
  const kept = samples.filter(sample => sample.at >= cutoff && sample.at !== at);
  const previous = samples.find(sample => sample.at === at);
  kept.push(mergeSample(previous, { ...next, at }));
  kept.sort((a, b) => a.at - b.at);
  return kept;
}

function sampleFromUpdate(update: CoachDeltaUpdate, receivedAtMs: number): CoachStreamSample | null {
  const sample: CoachStreamSample = { at: updateTime(update.timestamp, receivedAtMs) };
  let primary: number | null = null;
  let port: number | null = null;
  let starboard: number | null = null;
  let rudderSeen = false;
  let used = false;
  for (const entry of update.values ?? []) {
    const key = stripVessel(entry.path);
    if (readNumber(sample, key, entry.value)) used = true;
    if (key === 'steering.rudderAngle') {
      rudderSeen = true;
      primary = finite(entry.value);
    }
    if (key === 'steering.rudderAngle.port') {
      rudderSeen = true;
      port = finite(entry.value);
    }
    if (key === 'steering.rudderAngle.starboard') {
      rudderSeen = true;
      starboard = finite(entry.value);
    }
    if (key === 'navigation.attitude') {
      const parts = attitudeParts(entry.value);
      if (parts?.pitch != null) sample.pitchRad = parts.pitch;
      if (parts?.roll != null) sample.rollRad = parts.roll;
      if (parts) used = true;
    }
    if (key === 'navigation.attitude.pitch' && finite(entry.value) != null) {
      sample.pitchRad = finite(entry.value) as number;
      used = true;
    }
    if (key === 'navigation.attitude.roll' && finite(entry.value) != null) {
      sample.rollRad = finite(entry.value) as number;
      used = true;
    }
    if (key === 'navigation.attitude.accelZ' && finite(entry.value) != null) {
      sample.accelZ = finite(entry.value) as number;
      used = true;
    }
    const pilot = key === 'steering.autopilot.state' ? pilotFrom(entry.value) : null;
    if (pilot) {
      sample.autopilotEngaged = pilot.engaged;
      sample.autopilotMode = pilot.mode;
      used = true;
    }
  }
  if (rudderSeen) {
    sample.rudderPrimaryRad = primary;
    sample.rudderPortRad = port;
    sample.rudderStarboardRad = starboard;
    if (combinedRudderDeg(primary, port, starboard) != null) used = true;
  }
  return used ? sample : null;
}

function readNumber(sample: CoachStreamSample, key: string, value: unknown): boolean {
  const raw = finite(value);
  if (raw == null) return false;
  switch (key) {
    case 'environment.wind.speedTrue':
      sample.twsKn = knotsFromMps(raw);
      return true;
    case 'environment.wind.speedApparent':
      sample.awsKn = knotsFromMps(raw);
      return true;
    case 'environment.wind.angleTrueWater':
    case 'environment.wind.angleTrueGround': {
      const signed = signedAngleToDegrees(raw);
      sample.signedTwaDeg = signed;
      sample.twaDeg = Math.abs(signed);
      return true;
    }
    case 'environment.wind.directionTrue':
      sample.twdDeg = angleToDegrees(raw);
      return true;
    case 'navigation.speedThroughWater':
      sample.stwKn = knotsFromMps(raw);
      return true;
    case 'navigation.speedOverGround':
      sample.sogKn = knotsFromMps(raw);
      return true;
    case 'navigation.headingTrue':
      sample.headingDeg = angleToDegrees(raw);
      return true;
    case 'navigation.courseOverGroundTrue':
      sample.cogDeg = angleToDegrees(raw);
      return true;
    default:
      return false;
  }
}

function pilotFrom(value: unknown): { engaged: boolean; mode: string } | null {
  const mode = typeof value === 'string'
    ? value.trim()
    : value && typeof value === 'object'
      ? stringField(value as Record<string, unknown>, 'state') || stringField(value as Record<string, unknown>, 'mode')
      : '';
  if (!mode) return null;
  return { mode, engaged: !STANDBY.test(mode) };
}

function stringField(record: Record<string, unknown>, key: string): string {
  const value = record[key];
  return typeof value === 'string' ? value.trim() : '';
}

function mergeSample(previous: CoachStreamSample | undefined, next: CoachStreamSample): CoachStreamSample {
  const merged: CoachStreamSample = { ...(previous ?? { at: next.at }) };
  for (const [key, value] of Object.entries(next)) {
    if (value !== undefined) (merged as unknown as Record<string, unknown>)[key] = value;
  }
  return merged;
}

function updateTime(timestamp: string | undefined, receivedAtMs: number): number {
  if (timestamp) {
    const parsed = Date.parse(timestamp);
    if (Number.isFinite(parsed)) return parsed;
  }
  return receivedAtMs;
}

function finite(value: unknown): number | null {
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}
