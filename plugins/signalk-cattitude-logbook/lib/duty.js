const DAY_MS = 24 * 60 * 60 * 1000;

/** Person holding the watch task at a wall-clock time, or '' when nobody is assigned. */
function watchAssignee(rota, atMs) {
  if (!rota || typeof rota !== 'object' || !Number.isFinite(atMs)) return '';
  const start = parseWall(rota.startAt);
  const people = namedCrew(rota.crew);
  if (start == null || !people.size || atMs < start) return '';
  const task = watchTask(rota.tasks);
  if (!task) return '';
  const rotation = rotationNames(task, people);
  const interval = Number(task.intervalHours) * 60 * 60 * 1000;
  if (!rotation.length || !Number.isFinite(interval) || interval <= 0) return '';
  const index = assignmentIndex(start, interval, atMs);
  return rotation[index % rotation.length] || '';
}

function watchTask(tasks) {
  if (!Array.isArray(tasks)) return null;
  const byId = tasks.find((task) => task && task.id === 'watch');
  if (byId) return byId;
  return tasks.find((task) => String(task?.name || '').trim().toLowerCase() === 'watch') || null;
}

function namedCrew(crew) {
  const people = new Map();
  if (!Array.isArray(crew)) return people;
  for (const person of crew) {
    const name = String(person?.name || '').trim();
    const id = typeof person?.id === 'string' ? person.id : '';
    if (id && name) people.set(id, name);
  }
  return people;
}

function rotationNames(task, people) {
  const sequence = Array.isArray(task.sequence) ? task.sequence : [];
  const names = [];
  for (const id of sequence) {
    const name = people.get(id);
    if (name) names.push(name);
  }
  return names;
}

function assignmentBounds(startMs, intervalMs, index) {
  if (intervalMs === DAY_MS) {
    const firstEnd = startMs === startOfWallDay(startMs) ? startMs + DAY_MS : startOfWallDay(startMs) + DAY_MS;
    if (index <= 0) return { startMs, endMs: firstEnd };
    const slotStart = firstEnd + (index - 1) * DAY_MS;
    return { startMs: slotStart, endMs: slotStart + DAY_MS };
  }
  const slotStart = startMs + Math.max(0, index) * intervalMs;
  return { startMs: slotStart, endMs: slotStart + intervalMs };
}

function assignmentIndex(startMs, intervalMs, atMs) {
  if (atMs <= startMs) return 0;
  if (intervalMs === DAY_MS) {
    const firstEnd = assignmentBounds(startMs, intervalMs, 0).endMs;
    if (atMs < firstEnd) return 0;
    return 1 + Math.floor((atMs - firstEnd) / DAY_MS);
  }
  return Math.floor((atMs - startMs) / intervalMs);
}

function startOfWallDay(ms) {
  const date = new Date(ms);
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate());
}

function parseWall(value) {
  const match = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})$/.exec(String(value || '').trim().slice(0, 16));
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  const hour = Number(match[4]);
  const minute = Number(match[5]);
  if (month < 1 || month > 12 || hour > 23 || minute > 59) return null;
  const ms = Date.UTC(year, month - 1, day, hour, minute);
  const check = new Date(ms);
  if (check.getUTCFullYear() !== year || check.getUTCMonth() !== month - 1 || check.getUTCDate() !== day) {
    return null;
  }
  return ms;
}

module.exports = { watchAssignee };
