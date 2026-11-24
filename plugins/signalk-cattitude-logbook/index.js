const fs = require('fs');
const path = require('path');
const { createReading, enginesRunning, ingest, SUBSCRIBE_PATHS } = require('./lib/ingest');
const {
  anchoringPauseActive,
  derivePropulsion,
  destinationDistanceNm,
  intervalDue,
  normalizeSettings,
  propulsionTriggerFor,
  readingUsable,
  sailsUp,
} = require('./lib/math');
const { applyPassageEvent, buildEntry, toLogentryResource } = require('./lib/entry');
const { watchAssignee } = require('./lib/duty');
const { emptyRevs, mergeContext, normalizeRevs, sailLabel } = require('./lib/context');
const { HOUSE_BATTERY_PATH, houseBatteryAlarm, normalizeAlerts } = require('./lib/alarms');
const { exportTrack, importTrack, trackSince } = require('./lib/track');
const {
  POLAR_RETAIN_MS,
  POLAR_SAMPLE_MS,
  createPolarRecorder,
  exportPolar,
  importPolar,
  recordPolar,
  samplesSince,
} = require('./lib/polar');

const SAMPLE_MS = 10_000;
const RETAIN_MS = 48 * 60 * 60 * 1000;
const TRACK_SAVE_MS = 5 * 60_000;
const AUTOMATIC = new Set([
  'interval',
  'propulsion-change',
  'sail-change',
  'waypoint',
  'departure',
  'arrival',
]);

module.exports = (app) => {
  const plugin = {
    id: 'cattitude-logbook',
    name: 'Cattitude logbook recorder',
    description: 'Writes Clever Sailor log entries, and keeps polar history, while Signal K is running.',
    schema: {
      type: 'object',
      properties: {},
    },
  };

  let reading = createReading();
  let samples = [];
  let state = emptyState();
  let dataDir = '';
  let timer = null;
  let unsubscribes = [];
  let chain = Promise.resolve();
  let recordingAt = 0;
  let polar = createPolarRecorder();
  let polarTimer = null;
  let polarDirty = false;
  let polarSavedAt = 0;
  let trackSavedAt = 0;
  let houseAlarmState = null;

  plugin.start = () => {
    dataDir = app.getDataDirPath();
    state = loadState(dataDir);
    polar = loadPolar(dataDir);
    samples = loadTrack(dataDir);
    trackSavedAt = Date.now();
    houseAlarmState = null;
    registerStateProvider();
    const subscription = {
      context: 'vessels.self',
      subscribe: SUBSCRIBE_PATHS.map((pathName) => ({ path: pathName, period: 1000 })),
    };
    app.subscriptionmanager.subscribe(
      subscription,
      unsubscribes,
      (err) => app.error(`Cattitude logbook subscribe failed: ${err}`),
      (delta) => {
        const nowMs = Date.now();
        for (const update of delta.updates || []) {
          const at = update.timestamp ? Date.parse(update.timestamp) : nowMs;
          const stamp = Number.isFinite(at) ? at : nowMs;
          for (const value of update.values || []) ingest(reading, value.path, value.value, stamp);
        }
      },
    );
    timer = setInterval(() => {
      recordingAt = Date.now();
      sample(recordingAt);
      checkAlarms();
      if (recordingAt - trackSavedAt >= TRACK_SAVE_MS) {
        trackSavedAt = recordingAt;
        saveTrack();
      }
      chain = chain.then(() => evaluate(recordingAt)).catch((err) => {
        app.error(`Cattitude logbook: ${err.message}`);
      });
    }, SAMPLE_MS);
    recordingAt = Date.now();
    polarTimer = setInterval(() => {
      const now = Date.now();
      try {
        if (recordPolar(polar, reading, now)) polarDirty = true;
        if (polarDirty && now - polarSavedAt >= 60_000) {
          savePolar();
          polarDirty = false;
          polarSavedAt = now;
        }
      } catch (err) {
        app.error(`Cattitude logbook polar: ${err.message}`);
      }
    }, POLAR_SAMPLE_MS);
    setStatus();
  };

  plugin.stop = () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    unsubscribes = [];
    if (timer) clearInterval(timer);
    timer = null;
    if (polarTimer) clearInterval(polarTimer);
    polarTimer = null;
    persist();
    savePolar();
    saveTrack();
  };

  plugin.registerWithRouter = (router) => {
    const read = typeof router.access === 'function' ? router.access('readonly') : router;
    const write = typeof router.access === 'function' ? router.access('readwrite') : router;
    read.get('/status', (req, res) => {
      res.json(publicState());
    });
    read.get('/polar', (req, res) => {
      const since = Number(req.query.since);
      res.json({
        now: Date.now(),
        retainMs: POLAR_RETAIN_MS,
        sampleIntervalMs: POLAR_SAMPLE_MS,
        samples: samplesSince(polar, since),
      });
    });
    read.get('/track', (req, res) => {
      res.json({
        now: Date.now(),
        retainMs: RETAIN_MS,
        sampleIntervalMs: SAMPLE_MS,
        samples: trackSince(samples, Number(req.query.since), Number(req.query.step)),
      });
    });
    write.put('/context', (req, res) => {
      const conflicts = applyContext(req.body || {});
      // 409 tells the phone its copy was older. The body is the boat's state to adopt.
      res.status(conflicts.length ? 409 : 200).json({ ...publicState(), conflicts });
    });
    write.post('/record', (req, res) => {
      const body = req.body || {};
      chain = chain.then(async () => {
        const entry = await recordTrigger(body.trigger, {
          remarks: body.remarks,
          waypointId: body.waypointId,
          force: body.force === true,
        }, Date.now());
        if (!entry) {
          res.status(204).end();
          return;
        }
        res.json(entry);
      }).catch((err) => {
        app.error(`Cattitude logbook record failed: ${err.message}`);
        if (!res.headersSent) res.status(503).json({ message: err.message });
      });
    });
    write.put('/entries/:id', (req, res) => {
      chain = chain.then(async () => {
        const entry = await correctEntry(req.params.id, req.body || {});
        if (!entry) {
          res.status(404).json({ message: 'Entry not found' });
          return;
        }
        res.json(entry);
      }).catch((err) => {
        if (!res.headersSent) res.status(503).json({ message: err.message });
      });
    });
  };

  function registerStateProvider() {
    if (typeof app.registerResourceProvider !== 'function') return;
    try {
      app.registerResourceProvider({
        type: 'cattitude-logbook',
        methods: {
          async listResources() {
            return { state: publicState() };
          },
          async getResource(id) {
            if (id !== 'state') throw notFound();
            return publicState();
          },
          async setResource(id, value) {
            if (id !== 'state') throw notFound();
            applyContext(value || {});
          },
          async deleteResource() {},
        },
      });
    } catch (err) {
      app.debug(`Cattitude logbook state provider: ${err.message}`);
    }
  }

  function publicState() {
    return {
      recording: true,
      recordingAt: new Date(recordingAt || Date.now()).toISOString(),
      // The boat's own clock, so phones judge freshness without trusting theirs.
      now: new Date().toISOString(),
      settings: state.settings,
      passage: state.passage,
      sails: state.sails,
      rota: state.rota,
      alerts: normalizeAlerts(state.alerts),
      revs: normalizeRevs(state.revs),
    };
  }

  /** Returns the parts refused because the phone sent them from an older revision. */
  function applyContext(body) {
    const merged = mergeContext(state, body, Date.now());
    state = merged.state;
    persist();
    return merged.conflicts;
  }

  function bumpRev(part) {
    state.revs = normalizeRevs(state.revs);
    state.revs[part] += 1;
  }

  async function applyRotaWatch(now) {
    const passage = state.passage;
    if (!passage || !state.rota) return;
    const watch = watchAssignee(state.rota, now + (Number(state.wallOffsetMs) || 0));
    if (String(passage.watch || '').trim() === watch) return;
    const previous = passage;
    state.passage = { ...passage, watch };
    bumpRev('passage');
    if (!passage.departedAt) {
      persist();
      return;
    }
    try {
      await recordTrigger('watch-change', { force: true }, now);
    } catch (err) {
      state.passage = previous;
      throw err;
    }
  }

  async function evaluate(now) {
    await applyRotaWatch(now);
    if (!readingUsable(reading)) {
      setStatus();
      return;
    }
    const selection = state.sails;
    const propulsion = derivePropulsion({
      navState: reading.navState,
      enginesRunning: enginesRunning(reading),
      sailsUp: sailsUp(selection.main, selection.headsail),
      sogKn: reading.sogKn,
    });
    if (state.stable == null) {
      state.stable = propulsion;
      state.stateSince = now;
    } else if (propulsion !== state.stable) {
      if (state.pending !== propulsion) {
        state.pending = propulsion;
        state.pendingSince = now;
        state.stateSince = now;
      }
    } else {
      state.pending = null;
    }

    if (await passWaypoint(now)) return;
    if (await maybePropulsion(propulsion, now)) return;
    if (await maybeSails(now)) return;
    await maybeInterval(propulsion, now);
    setStatus();
  }

  async function passWaypoint(now) {
    const passage = state.passage;
    if (!passage || !reading.position) return false;
    const next = (passage.waypoints || []).find((waypoint) => !waypoint.passedAt);
    if (!next) return false;
    const distance = destinationDistanceNm(reading.position, {
      ...passage,
      destinationLat: next.lat,
      destinationLon: next.lon,
    });
    const radius = passage.arrivalRadiusNm > 0 ? passage.arrivalRadiusNm : 0.3;
    if (distance == null || distance > radius) return false;
    const entry = await recordTrigger('waypoint', { waypointId: next.id, force: true }, now);
    return !!entry;
  }

  async function maybePropulsion(propulsion, now) {
    if (!state.pending || state.stable == null) return false;
    const wait = state.settings.propulsionDebounceMin * 60_000;
    if (now - state.pendingSince < wait) return false;
    if (propulsion !== state.pending) return false;
    const distance = destinationDistanceNm(reading.position, state.passage);
    const trigger = propulsionTriggerFor(state.stable, propulsion, state.passage, distance);
    const entry = await recordTrigger(trigger, { force: true }, now);
    if (entry) {
      state.stable = propulsion;
      state.pending = null;
      persist();
    }
    return !!entry;
  }

  async function maybeSails(now) {
    if (state.sailDirtyAt == null) return false;
    const wait = state.settings.sailDebounceMin * 60_000;
    if (now - state.sailDirtyAt < wait) return false;
    const label = state.sails.label || '';
    const last = state.lastEntry;
    if ((last && last.sailsLabel === label) || (!last && !label)) {
      state.sailDirtyAt = null;
      return false;
    }
    const entry = await recordTrigger('sail-change', {}, now);
    if (entry) state.sailDirtyAt = null;
    return !!entry;
  }

  async function maybeInterval(propulsion, now) {
    const settings = state.settings;
    if (anchoringPauseActive(propulsion, state.stateSince, now, settings.pauseWhenAnchored)) return;
    const lastMs = state.lastIntervalAt ? Date.parse(state.lastIntervalAt) : 0;
    if (!intervalDue(now, lastMs, settings.intervalHours, settings.offsetMinutes)) return;
    await recordTrigger('interval', {}, now);
  }

  async function recordTrigger(trigger, options, nowMs) {
    if (!trigger) return null;
    if (AUTOMATIC.has(trigger) && !options.force && !readingUsable(reading)) return null;
    let waypoint = null;
    if (trigger === 'waypoint') {
      waypoint = (state.passage?.waypoints || []).find((item) => item.id === options.waypointId && !item.passedAt) || null;
      if (!waypoint) return null;
    }
    const entry = buildEntry({
      reading,
      samples,
      passage: state.passage,
      sails: state.sails,
      trigger,
      remarks: options.remarks || '',
      nowMs,
      previous: state.lastEntry,
      recentSog: state.recentSog || [],
    });
    await writeResource(entry);
    remember(entry);
    bumpRev('entries');
    const passage = applyPassageEvent(state.passage, trigger, entry.at, waypoint?.id ?? null);
    if (passage !== state.passage) {
      state.passage = passage;
      bumpRev('passage');
    }
    persist();
    const status = app.setPluginStatus || app.setProviderStatus;
    if (status) status(`Logged ${trigger}`);
    return entry;
  }

  async function correctEntry(id, patch) {
    if (!app.resourcesApi || typeof app.resourcesApi.getResource !== 'function') {
      throw new Error('signalk-logbook is not providing the logentries API');
    }
    const current = await app.resourcesApi.getResource('logentries', id);
    const embedded = current && current['x-cattitude'];
    if (!embedded || embedded.id !== id) return null;
    const now = new Date().toISOString();
    const corrections = [...(embedded.corrections || [])];
    const next = { ...embedded, updatedAt: now };
    for (const field of ['remarks', 'seaState', 'cloudOktas', 'visibilityNm', 'watch']) {
      if (patch[field] === undefined || patch[field] === embedded[field]) continue;
      corrections.push({
        at: now,
        field,
        from: embedded[field],
        to: patch[field],
        by: 'crew',
      });
      next[field] = patch[field];
    }
    if (corrections.length === (embedded.corrections || []).length) return embedded;
    next.corrections = corrections;
    const resource = toLogentryResource(next);
    delete resource.enrich;
    await app.resourcesApi.setResource('logentries', id, { ...resource, enrich: false });
    bumpRev('entries');
    persist();
    return next;
  }

  async function writeResource(entry) {
    if (!app.resourcesApi || typeof app.resourcesApi.setResource !== 'function') {
      throw new Error('Install and enable signalk-logbook so entries have a place to go');
    }
    await app.resourcesApi.setResource('logentries', entry.id, toLogentryResource(entry));
  }

  function remember(entry) {
    state.lastEntry = {
      at: entry.at,
      position: entry.position ? { lat: entry.position.lat, lon: entry.position.lon } : null,
      tripLogM: entry.tripLogM,
      sogKn: entry.sogKn,
      sailsLabel: entry.sails?.label || '',
    };
    state.recentSog = [entry.sogKn, ...(state.recentSog || [])].slice(0, 3);
    if (entry.trigger === 'interval') state.lastIntervalAt = entry.at;
  }

  function sample(now) {
    const sampleRow = {
      at: now,
      lat: reading.position?.lat ?? null,
      lon: reading.position?.lon ?? null,
      twsKn: reading.twsKn,
      pressureHpa: reading.pressureHpa,
      tripLogM: reading.tripLogM,
      sogKn: reading.sogKn,
    };
    const hasValue = sampleRow.lat != null || sampleRow.twsKn != null
      || sampleRow.pressureHpa != null || sampleRow.sogKn != null;
    if (!hasValue) return;
    samples.push(sampleRow);
    const cutoff = now - RETAIN_MS;
    if (samples.length && samples[0].at < cutoff) {
      samples = samples.filter((item) => item.at >= cutoff);
    }
  }

  /** Raise or clear the house battery alarm when its state changes. */
  function checkAlarms() {
    const notice = houseBatteryAlarm(reading, state.alerts);
    if (!notice || notice.state === houseAlarmState) return;
    if (houseAlarmState == null && notice.state === 'normal') {
      houseAlarmState = 'normal';
      return;
    }
    houseAlarmState = notice.state;
    try {
      app.handleMessage(plugin.id, {
        updates: [{ values: [{ path: HOUSE_BATTERY_PATH, value: notice }] }],
      });
    } catch (err) {
      app.error(`Cattitude logbook alarm: ${err.message}`);
    }
  }

  function loadTrack(dir) {
    try {
      const raw = JSON.parse(fs.readFileSync(path.join(dir, 'track.json'), 'utf8'));
      return importTrack(raw, Date.now() - RETAIN_MS);
    } catch {
      return [];
    }
  }

  function saveTrack() {
    if (!dataDir) return;
    try {
      const file = path.join(dataDir, 'track.json');
      const temp = `${file}.tmp`;
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(temp, JSON.stringify(exportTrack(samples)));
      fs.renameSync(temp, file);
    } catch (err) {
      app.error(`Cattitude logbook track history: ${err.message}`);
    }
  }

  function setStatus() {
    const status = app.setPluginStatus || app.setProviderStatus;
    if (!status) return;
    status(readingUsable(reading) ? 'Recording' : 'Waiting for navigation data');
  }

  function loadPolar(dir) {
    try {
      return importPolar(JSON.parse(fs.readFileSync(path.join(dir, 'polar.json'), 'utf8')));
    } catch {
      return createPolarRecorder();
    }
  }

  function savePolar() {
    if (!dataDir) return;
    try {
      const file = path.join(dataDir, 'polar.json');
      const temp = `${file}.tmp`;
      fs.mkdirSync(dataDir, { recursive: true });
      fs.writeFileSync(temp, JSON.stringify(exportPolar(polar)));
      fs.renameSync(temp, file);
    } catch (err) {
      app.error(`Cattitude logbook polar history: ${err.message}`);
    }
  }

  function persist() {
    if (!dataDir) return;
    const file = path.join(dataDir, 'state.json');
    const json = JSON.stringify(state);
    const temp = `${file}.tmp`;
    fs.mkdirSync(dataDir, { recursive: true });
    fs.writeFileSync(temp, json);
    fs.renameSync(temp, file);
  }

  return plugin;
};

function emptyState() {
  return {
    settings: normalizeSettings(null),
    passage: null,
    sails: { main: '', headsail: '', label: '', recommended: null },
    rota: null,
    wallOffsetMs: 0,
    revs: emptyRevs(),
    alerts: normalizeAlerts(null),
    stable: null,
    pending: null,
    pendingSince: 0,
    stateSince: 0,
    sailDirtyAt: null,
    lastEntry: null,
    lastIntervalAt: null,
    recentSog: [],
  };
}

function loadState(dir) {
  try {
    const parsed = JSON.parse(fs.readFileSync(path.join(dir, 'state.json'), 'utf8'));
    return {
      ...emptyState(),
      ...parsed,
      revs: normalizeRevs(parsed.revs),
      alerts: normalizeAlerts(parsed.alerts),
      settings: normalizeSettings(parsed.settings),
      sails: {
        main: parsed.sails?.main || '',
        headsail: parsed.sails?.headsail || '',
        label: parsed.sails?.label || sailLabel(parsed.sails || {}),
        recommended: parsed.sails?.recommended ?? null,
      },
    };
  } catch {
    return emptyState();
  }
}

function notFound() {
  const err = new Error('Not found');
  err.code = 'ENOENT';
  return err;
}
