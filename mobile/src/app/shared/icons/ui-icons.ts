import { addIcons } from 'ionicons';

/**
 * UI chrome icons. Published guides still store emoji and Material names;
 * this module turns those into Ionicons. An emoji with no mapping is left
 * as text so owner-authored content can keep a pictograph we do not know.
 */

const ANCHOR_OUTLINE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><circle cx='256' cy='128' r='48' class='ionicon-fill-none ionicon-stroke-width'/><path d='M256 176v192M128 288h256' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/><path d='M128 288c0 70.7 57.3 128 128 128s128-57.3 128-128' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/></svg>`;

const TOILET_OUTLINE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><rect x='168' y='40' width='176' height='112' rx='20' class='ionicon-fill-none ionicon-stroke-width'/><ellipse cx='256' cy='268' rx='120' ry='76' class='ionicon-fill-none ionicon-stroke-width'/><path d='M208 336v52M304 336v52M208 388h96' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/><circle cx='304' cy='88' r='12' class='ionicon-fill-none ionicon-stroke-width'/></svg>`;

const WIND_OUTLINE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><path d='M80 168h240c28 0 48-18 48-40s-20-40-48-40' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/><path d='M48 256h352c32 0 56 20 56 48s-24 48-56 48' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/><path d='M112 344h192c26 0 44-16 44-36s-18-36-44-36' class='ionicon-fill-none ionicon-stroke-width' stroke-linecap='round'/></svg>`;

addIcons({
  'anchor-outline': ANCHOR_OUTLINE,
  'toilet-outline': TOILET_OUTLINE,
  'wind-outline': WIND_OUTLINE,
});

export type ResolvedUiIcon =
  | { kind: 'ion'; name: string }
  | { kind: 'emoji'; text: string };

/** Guide emoji (variation selectors stripped) → Ionicons name. */
const EMOJI_TO_ION: Record<string, string> = {};
for (const [emoji, name] of [
  ['📘', 'book-outline'],
  ['📖', 'book-outline'],
  ['✅', 'checkmark-circle-outline'],
  ['📋', 'clipboard-outline'],
  ['🔧', 'build-outline'],
  ['💬', 'chatbubble-ellipses-outline'],
  ['⛵', 'boat-outline'],
  ['🚤', 'boat'],
  ['📈', 'trending-up-outline'],
  ['⚓', 'anchor-outline'],
  ['⚙️', 'cog-outline'],
  ['🎛️', 'options-outline'],
  ['⚡', 'flash-outline'],
  ['🔋', 'battery-full-outline'],
  ['🪫', 'battery-dead-outline'],
  ['💧', 'water-outline'],
  ['🚽', 'toilet-outline'],
  ['🍳', 'restaurant-outline'],
  ['🧭', 'compass-outline'],
  ['❄️', 'snow-outline'],
  ['🚀', 'rocket-outline'],
  ['🔒', 'lock-closed-outline'],
  ['🏁', 'flag-outline'],
  ['🗺️', 'map-outline'],
  ['🛟', 'help-buoy-outline'],
  ['🪢', 'link-outline'],
  ['💨', 'wind-outline'],
  ['🌊', 'water-outline'],
  ['📌', 'pin-outline'],
  ['📻', 'radio-outline'],
  ['🧊', 'cube-outline'],
  ['⚠️', 'warning-outline'],
  ['🔴', 'alert-circle-outline'],
  ['🌡️', 'thermometer-outline'],
  ['📍', 'location-outline'],
  ['🆘', 'help-buoy-outline'],
  ['📞', 'call-outline'],
  ['🚨', 'warning-outline'],
  ['•', 'ellipse-outline'],
] as const) {
  EMOJI_TO_ION[stripMarks(emoji)] = name;
}

/** Material / LLM icon names → Ionicons name. */
const MATERIAL_TO_ION: Record<string, string> = {
  warning: 'warning-outline',
  warning_amber: 'warning-outline',
  error: 'alert-circle-outline',
  error_outline: 'alert-circle-outline',
  battery_alert: 'battery-dead-outline',
  battery_full: 'battery-full-outline',
  battery_charging_full: 'battery-charging-outline',
  battery_std: 'battery-full-outline',
  thermostat: 'thermometer-outline',
  device_thermostat: 'thermometer-outline',
  water_drop: 'water-outline',
  bolt: 'flash-outline',
  electrical_services: 'flash-outline',
  build: 'build-outline',
  handyman: 'build-outline',
  anchor: 'anchor-outline',
  sailing: 'boat-outline',
  directions_boat: 'boat',
  ac_unit: 'snow-outline',
  kitchen: 'cube-outline',
  radio: 'radio-outline',
  explore: 'compass-outline',
  navigation: 'compass-outline',
};

function stripMarks(value: string): string {
  return value.replace(/[\uFE0E\uFE0F]/g, '');
}

function materialKey(raw: string): string | undefined {
  const direct = raw.toLowerCase().replace(/[-\s]/g, '_');
  if (MATERIAL_TO_ION[direct]) {
    return MATERIAL_TO_ION[direct];
  }
  const snake = raw
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[-\s]/g, '_');
  return MATERIAL_TO_ION[snake];
}

export function resolveUiIcon(icon: string | undefined, fallback: string): ResolvedUiIcon {
  const raw = (icon ?? '').trim();
  if (!raw) {
    return { kind: 'ion', name: fallback };
  }

  if ([...raw].some((ch) => (ch.codePointAt(0) ?? 0) > 127)) {
    const stripped = stripMarks(raw);
    if (stripped.startsWith('\u{1F321}')) {
      return { kind: 'ion', name: 'thermometer-outline' };
    }
    const mapped = EMOJI_TO_ION[stripped];
    if (mapped) {
      return { kind: 'ion', name: mapped };
    }
    return { kind: 'emoji', text: raw };
  }

  const named = materialKey(raw);
  if (named) {
    return { kind: 'ion', name: named };
  }
  if (/^[a-z0-9]+(-[a-z0-9]+)+$/.test(raw)) {
    return { kind: 'ion', name: raw };
  }
  return { kind: 'ion', name: fallback };
}
