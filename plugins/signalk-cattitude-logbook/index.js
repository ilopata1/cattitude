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

const SAMPLE_MS = 10_000;
const RETAIN_MS = 48 * 60 * 60 * 1000;
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
    description: 'Writes Clever Sailor log entries into signalk-logbook while Signal K is running.',
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

  plugin.start = () => {
    dataDir = app.getDataDirPath();
    state = loadState(dataDir);
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
      chain = chain.then(() => evaluate(recordingAt)).catch((err) => {
        app.error(`Cattitude logbook: ${err.message}`);
      });
    }, SAMPLE_MS);
    recordingAt = Date.now();
    setStatus();
  };

  plugin.stop = () => {
    unsubscribes.forEach((unsubscribe) => unsubscribe());
    unsubscribes = [];
    if (timer) clearInterval(timer);
    timer = null;
    persist();
  };

  plugin.registerWithRouter = (router) => {
    const read = typeof router.access === 'function' ? router.access('readonly') : router;
    const write = typeof router.access === 'function' ? router.access('readwrite') : router;
    read.get('/status', (req, res) => {
      res.json(publicState());
    });
    write.put('/context', (req, res) => {
      const watchChanged = applyContext(req.body || {});
      if (!watchChanged) {
        res.json(publicState());
        return;
      }
      chain = chain.then(async () => {
        await recordTrigger('watch-change', { force: true }, Date.now());
        res.json(publicState());
      }).catch((err) => {
        if (!res.headersSent) res.status(503).json({ message: err.message });
      });
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
            const watchChanged = applyContext(value || {});
            if (watchChanged) {
              chain = chain.then(() => recordTrigger('watch-change', { force: true }, Date.now()));
            }
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
      settings: state.settings,
      passage: state.passage,
      sails: state.sails,
    };
  }

  function applyContext(body) {
    if (body.settings) state.settings = normalizeSettings(body.settings);
    if (body.sails && typeof body.sails === 'object') {
      const next = {
        main: String(body.sails.main || ''),
        headsail: String(body.sails.headsail || ''),
        label: sailLabel(body.sails),
        recommended: body.recommended ?? body.sails.recommended ?? state.sails.recommended ?? null,
      };
      if (next.label !== state.sails.label) {
        state.sails = next;
        state.sailDirtyAt = Date.now();
      } else {
        state.sails = next;
      }
    } else if (body.recommended !== undefined) {
      state.sails = { ...state.sails, recommended: body.recommended };
    }
    let watchChanged = false;
    if (body.passage && typeof body.passage === 'object') {
      const previous = state.passage;
      state.passage = body.passage;
      watchChanged = !!(previous
        && String(previous.watch || '').trim() !== String(body.passage.watch || '').trim()
        && body.passage.departedAt);
    }
    persist();
    return watchChanged;
  }

  async function evaluate(now) {
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
    state.passage = applyPassageEvent(state.passage, trigger, entry.at, waypoint?.id ?? null);
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

  function setStatus() {
    const status = app.setPluginStatus || app.setProviderStatus;
    if (!status) return;
    status(readingUsable(reading) ? 'Recording' : 'Waiting for navigation data');
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

function sailLabel(sails) {
  if (!sails) return '';
  if (sails.label) return String(sails.label);
  return [sails.main, sails.headsail].filter(Boolean).join(' + ');
}

function notFound() {
  const err = new Error('Not found');
  err.code = 'ENOENT';
  return err;
}
