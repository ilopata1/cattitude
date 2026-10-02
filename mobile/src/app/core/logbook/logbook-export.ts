import { LogEntry, Passage } from '../models/logbook.model';
import { formatLogClock, formatPosition } from './logbook-math';

export function logbookToCsv(entries: LogEntry[]): string {
  const header = [
    'time_utc',
    'trigger',
    'lat',
    'lon',
    'position',
    'heading_true',
    'cog',
    'sog_kn',
    'stw_kn',
    'tws_kn',
    'twd',
    'tws_mean_kn',
    'gust_kn',
    'gust_10m_kn',
    'beaufort',
    'pressure_hpa',
    'pressure_trend_3h',
    'depth_m',
    'propulsion',
    'sails',
    'recommended',
    'nm_since_entry',
    'nm_log',
    'nm_since_waypoint',
    'nm_to_destination',
    'cmg',
    'smg_kn',
    'vmg_kn',
    'eta_utc',
    'watch',
    'sea_state',
    'cloud_oktas',
    'visibility_nm',
    'remarks',
    'stale',
  ];
  const lines = [header.join(',')];
  const ordered = [...entries].sort((a, b) => a.at.localeCompare(b.at));
  for (const entry of ordered) {
    lines.push([
      entry.at,
      entry.trigger,
      entry.position?.lat ?? '',
      entry.position?.lon ?? '',
      entry.position ? formatPosition(entry.position.lat, entry.position.lon) : '',
      num(entry.headingTrueDeg),
      num(entry.cogDeg),
      num(entry.sogKn),
      num(entry.stwKn),
      num(entry.wind.twsKn),
      num(entry.wind.twdDeg),
      num(entry.wind.meanTwsSinceLastKn),
      num(entry.wind.gustSinceLastKn),
      num(entry.wind.gust10mKn),
      num(entry.wind.beaufort),
      num(entry.pressureHpa),
      num(entry.pressureTrend3hHpa),
      num(entry.depthM),
      entry.propulsion.state,
      entry.sails.label,
      entry.sails.recommended ?? '',
      num(entry.distances.sinceLastEntryGroundNm),
      num(entry.distances.sinceLastEntryLogNm),
      num(entry.distances.sinceLastWaypointNm),
      num(entry.distances.toDestinationNm),
      num(entry.distances.cmgDeg),
      num(entry.distances.smgKn),
      num(entry.distances.vmgKn),
      entry.distances.etaUtc ?? '',
      entry.watch ?? '',
      num(entry.seaState),
      num(entry.cloudOktas),
      num(entry.visibilityNm),
      entry.remarks,
      entry.staleFields.join(' '),
    ].map(value => csvCell(String(value))).join(','));
  }
  return `${lines.join('\n')}\n`;
}

export function logbookToGpx(entries: LogEntry[], passage: Passage | null): string {
  const name = escapeXml(passage?.name?.trim() || 'Passage');
  const points = [...entries]
    .filter(entry => entry.position)
    .sort((a, b) => a.at.localeCompare(b.at));
  const body = points.map(entry => {
    const position = entry.position!;
    const note = escapeXml(
      `${formatLogClock(entry.at)} ${entry.propulsion.state} ${entry.sails.label} ${entry.remarks}`.trim(),
    );
    return [
      `      <trkpt lat="${position.lat.toFixed(6)}" lon="${position.lon.toFixed(6)}">`,
      `        <time>${escapeXml(entry.at)}</time>`,
      `        <name>${escapeXml(formatLogClock(entry.at))}</name>`,
      `        <desc>${note}</desc>`,
      '      </trkpt>',
    ].join('\n');
  }).join('\n');
  return [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<gpx version="1.1" creator="Cattitude" xmlns="http://www.topografix.com/GPX/1/1">',
    '  <trk>',
    `    <name>${name}</name>`,
    '    <trkseg>',
    body,
    '    </trkseg>',
    '  </trk>',
    '</gpx>',
    '',
  ].join('\n');
}

export function logbookPrintHtml(entries: LogEntry[], passage: Passage | null): string {
  const title = escapeXml(passage?.name?.trim() || 'Logbook');
  const rows = [...entries]
    .sort((a, b) => a.at.localeCompare(b.at))
    .map(entry => {
      const pos = entry.position
        ? escapeXml(formatPosition(entry.position.lat, entry.position.lon))
        : '';
      return `<tr>
        <td>${escapeXml(formatLogClock(entry.at))}</td>
        <td>${escapeXml(triggerLabel(entry.trigger))}</td>
        <td>${pos}</td>
        <td>${cell(entry.headingTrueDeg, '°')}</td>
        <td>${cell(entry.cogDeg, '°')}</td>
        <td>${cell(entry.sogKn, '')}</td>
        <td>${cell(entry.wind.twsKn, '')}</td>
        <td>${cell(entry.wind.gustSinceLastKn, '')}</td>
        <td>${cell(entry.pressureHpa, '')}</td>
        <td>${cell(entry.pressureTrend3hHpa, '')}</td>
        <td>${escapeXml(entry.propulsion.state)}</td>
        <td>${escapeXml(entry.sails.label)}</td>
        <td>${cell(entry.distances.sinceLastEntryGroundNm, '')}</td>
        <td>${cell(entry.distances.toDestinationNm, '')}</td>
        <td>${escapeXml(entry.watch ?? '')}</td>
        <td>${escapeXml(entry.remarks)}</td>
      </tr>`;
    })
    .join('\n');
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>${title}</title>
  <style>
    body { font-family: Georgia, serif; color: #1a1a1a; margin: 16px; }
    h1 { font-size: 18px; margin: 0 0 12px; }
    table { border-collapse: collapse; width: 100%; font-size: 11px; }
    th, td { border: 1px solid #bbb; padding: 3px 4px; text-align: left; vertical-align: top; }
    th { background: #f3f1ea; }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <table>
    <thead>
      <tr>
        <th>Time</th><th>Why</th><th>Position</th><th>HDG</th><th>COG</th>
        <th>SOG</th><th>TWS</th><th>Gust</th><th>hPa</th><th>3h</th>
        <th>Status</th><th>Sails</th><th>nm</th><th>DTG</th><th>Watch</th><th>Remarks</th>
      </tr>
    </thead>
    <tbody>
      ${rows}
    </tbody>
  </table>
</body>
</html>`;
}

export function triggerLabel(trigger: LogEntry['trigger']): string {
  switch (trigger) {
    case 'interval': return 'interval';
    case 'propulsion-change': return 'propulsion';
    case 'sail-change': return 'sail change';
    case 'waypoint': return 'waypoint';
    case 'departure': return 'departure';
    case 'arrival': return 'arrival';
    case 'manual': return 'manual';
    case 'watch-change': return 'watch';
  }
}

function cell(value: number | null, suffix: string): string {
  if (value == null) return '';
  return escapeXml(`${value}${suffix}`);
}

function num(value: number | null): string {
  return value == null ? '' : String(value);
}

function csvCell(value: string): string {
  if (/[",\n\r]/.test(value)) return `"${value.replace(/"/g, '""')}"`;
  return value;
}

function escapeXml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}
