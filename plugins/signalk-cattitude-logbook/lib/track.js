/** Track samples kept on the boat, saved to disk so a restart keeps the last 48 h. */

const FIELDS = ['at', 'lat', 'lon', 'twsKn', 'pressureHpa', 'tripLogM', 'sogKn'];

/** Columns instead of objects: about half the size on disk. */
function exportTrack(samples) {
  const columns = {};
  for (const field of FIELDS) columns[field] = samples.map((sample) => sample[field] ?? null);
  return { version: 1, columns };
}

function importTrack(raw, cutoffMs) {
  const columns = raw && raw.version === 1 && raw.columns && typeof raw.columns === 'object' ? raw.columns : null;
  if (!columns || !Array.isArray(columns.at)) return [];
  const out = [];
  for (let i = 0; i < columns.at.length; i++) {
    const at = Number(columns.at[i]);
    if (!Number.isFinite(at) || at < cutoffMs) continue;
    const sample = { at };
    for (const field of FIELDS.slice(1)) {
      const value = Array.isArray(columns[field]) ? columns[field][i] : null;
      sample[field] = Number.isFinite(value) ? value : null;
    }
    out.push(sample);
  }
  out.sort((a, b) => a.at - b.at);
  return out;
}

/**
 * Samples after `sinceMs`. With `stepMs`, keep at most one sample per step, so a phone
 * reaching the boat through the tunnel can fetch a day of history cheaply.
 */
function trackSince(samples, sinceMs, stepMs) {
  const since = Number.isFinite(sinceMs) ? sinceMs : 0;
  const step = Number.isFinite(stepMs) && stepMs > 0 ? stepMs : 0;
  const out = [];
  let lastKept = -Infinity;
  for (const sample of samples) {
    if (sample.at <= since) continue;
    if (step && sample.at - lastKept < step) continue;
    out.push(sample);
    lastKept = sample.at;
  }
  return out;
}

module.exports = { exportTrack, importTrack, trackSince };
