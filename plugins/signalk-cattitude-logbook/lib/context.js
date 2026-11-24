const { normalizeSettings } = require('./math');

/** Parts of the shared context that carry a revision. The boat assigns each one. */
const VERSIONED = ['settings', 'passage', 'rota', 'sails'];

function emptyRevs() {
  return { settings: 0, passage: 0, rota: 0, sails: 0, entries: 0 };
}

function normalizeRevs(raw) {
  const revs = emptyRevs();
  if (!raw || typeof raw !== 'object') return revs;
  for (const key of Object.keys(revs)) {
    const value = Number(raw[key]);
    if (Number.isInteger(value) && value >= 0) revs[key] = value;
  }
  return revs;
}

function sailLabel(sails) {
  if (!sails) return '';
  if (sails.label) return String(sails.label);
  return [sails.main, sails.headsail].filter(Boolean).join(' + ');
}

function same(a, b) {
  return JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
}

/**
 * Apply what a phone sent. A part sent with `baseRevs[part]` is taken only when that
 * matches the boat's revision, so a phone holding an older copy cannot overwrite a
 * newer one. A part sent without a base revision comes from an older app and is taken
 * as before. Returns the next state, the parts refused, and whether anything changed.
 */
function mergeContext(state, body, nowMs) {
  const next = { ...state, revs: normalizeRevs(state.revs) };
  const conflicts = [];
  let changed = false;
  const baseRevs = body && typeof body.baseRevs === 'object' && body.baseRevs ? body.baseRevs : null;

  const accepts = (part) => {
    if (!baseRevs || baseRevs[part] === undefined || baseRevs[part] === null) return true;
    if (Number(baseRevs[part]) === next.revs[part]) return true;
    conflicts.push(part);
    return false;
  };
  const bump = (part) => {
    next.revs[part] += 1;
    changed = true;
  };

  if (body.settings && accepts('settings')) {
    const settings = normalizeSettings(body.settings);
    if (!same(settings, next.settings)) {
      next.settings = settings;
      bump('settings');
    }
  }

  if (body.sails && typeof body.sails === 'object' && accepts('sails')) {
    const sails = {
      main: String(body.sails.main || ''),
      headsail: String(body.sails.headsail || ''),
      label: sailLabel(body.sails),
      recommended: body.recommended ?? body.sails.recommended ?? next.sails?.recommended ?? null,
    };
    if (sails.label !== next.sails?.label) {
      next.sailDirtyAt = nowMs;
      bump('sails');
    } else if (sails.main !== next.sails?.main || sails.headsail !== next.sails?.headsail) {
      bump('sails');
    }
    next.sails = sails;
  } else if (body.recommended !== undefined && !body.sails) {
    next.sails = { ...next.sails, recommended: body.recommended };
  }

  if (body.passage !== undefined && accepts('passage')) {
    const incoming = body.passage && typeof body.passage === 'object' ? body.passage : null;
    const previous = next.passage;
    let passage = null;
    if (incoming) {
      const samePassage = !!(previous && previous.id && incoming.id && previous.id === incoming.id);
      // The rota on this server owns the watch name. A phone publish must not move it.
      passage = { ...incoming, watch: samePassage ? (previous.watch ?? '') : (incoming.watch ?? '') };
    }
    if (!same(passage, previous) && (incoming || baseRevs)) {
      next.passage = passage;
      bump('passage');
    }
  }

  if (body.rota && typeof body.rota === 'object' && accepts('rota')) {
    if (!same(body.rota, next.rota)) {
      next.rota = body.rota;
      bump('rota');
    }
  }

  if (Number.isFinite(body.wallOffsetMs)) next.wallOffsetMs = body.wallOffsetMs;

  return { state: next, conflicts, changed };
}

module.exports = { VERSIONED, emptyRevs, mergeContext, normalizeRevs, sailLabel };
