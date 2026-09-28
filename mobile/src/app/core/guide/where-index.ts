/** Same zone labels as backend/location_model.py generate_label. No Angular imports. */

export interface WhereItem {
  name: string;
  location: string;
  zone: string | null;
  systemId: string;
  sectionIndex: number;
}

export interface WhereZone {
  id: string;
  label: string;
}

export interface WhereIndex {
  items: WhereItem[];
  zones: WhereZone[];
}

interface WhereSystem {
  title?: string;
  sections?: Array<{
    type?: string;
    rows?: Array<{ name?: string; location?: string }>;
  }>;
}

const LABEL_SEP = '\u2013';
const DECK_PREFIX = 'Deck \u2014 ';
const HULL_SIDES = ['Port', 'Starboard'];
const MULTIHULL = new Set(['sailing_catamaran', 'sailing_trimaran', 'power_catamaran']);
const FLYBRIDGE = new Set(['power_catamaran', 'motor_yacht', 'sport_fishing']);
const RIGGING = new Set(['cruising_monohull', 'sailing_catamaran', 'sailing_trimaran']);

const ZONE_ORDER: Array<[string, string, boolean]> = [
  ['accommodation_cabins', 'Accommodation / Cabins', true],
  ['saloon_living_area', 'Saloon / Living Area', false],
  ['galley', 'Galley', false],
  ['head_bathroom', 'Head / Bathroom', true],
  ['helm_nav_station', 'Helm / Navigation Station', true],
  ['cockpit', 'Cockpit', true],
  ['deck_bow_foredeck', 'Deck \u2014 Bow / Foredeck', false],
  ['deck_side_decks_beam', 'Deck \u2014 Side Decks & Beam', true],
  ['deck_stern_transom_swim_platform', 'Deck \u2014 Stern / Transom / Swim Platform', false],
  ['flybridge_upper_deck', 'Flybridge / Upper Deck', false],
  ['rigging_sail_handling', 'Rigging & Sail Handling', false],
  ['engine_machinery_space', 'Engine / Machinery Space', true],
  ['storage_lazarette', 'Storage / Lazarette', true],
  ['bilge_underfloor', 'Bilge / Underfloor', true],
];

const ZONE_LABELS: Record<string, string> = {};
const HULL_ELIGIBLE = new Set<string>();
for (const [slug, label, hull] of ZONE_ORDER) {
  ZONE_LABELS[slug] = label;
  if (hull) {
    HULL_ELIGIBLE.add(slug);
  }
}

type Sub = [string, string, boolean];
const SUBS: Record<string, Sub[]> = {
  accommodation_cabins: [
    ['forward_cabin', 'Forward Cabin', false],
    ['aft_cabin', 'Aft Cabin', false],
    ['midships_cabin', 'Midships Cabin', false],
    ['pilot_berth', 'Pilot Berth', false],
    ['saloon_berth', 'Saloon Berth', false],
    ['crew_cabin', 'Crew Cabin', false],
  ],
  saloon_living_area: [
    ['saloon_general', 'Saloon (general)', true],
    ['dinette', 'Dinette', false],
    ['bridgedeck_saloon', 'Bridgedeck Saloon', false],
  ],
  galley: [
    ['galley_general', 'Galley (general)', true],
    ['fridge_freezer_area', 'Fridge/Freezer Area', false],
    ['stove_oven_area', 'Stove/Oven Area', false],
    ['pantry_dry_storage', 'Pantry/Dry Storage', false],
  ],
  head_bathroom: [
    ['forward_head', 'Forward Head', false],
    ['aft_head', 'Aft Head', false],
    ['day_head', 'Day Head', false],
    ['shower_compartment', 'Shower Compartment', false],
  ],
  helm_nav_station: [
    ['interior_helm', 'Interior Helm', false],
    ['cockpit_helm', 'Cockpit Helm', false],
    ['flybridge_helm', 'Flybridge Helm', false],
    ['nav_station_chart_table', 'Nav Station/Chart Table', false],
  ],
  cockpit: [
    ['cockpit_general', 'Cockpit (general)', true],
    ['cockpit_locker', 'Cockpit Locker', false],
    ['cockpit_seating_bench', 'Cockpit Seating/Bench', false],
    ['winch_control_area', 'Winch/Control Area', false],
  ],
  deck_bow_foredeck: [
    ['foredeck', 'Foredeck', false],
    ['anchor_locker_ground_tackle', 'Anchor Locker/Ground Tackle', false],
    ['bow_roller_pulpit', 'Bow Roller/Pulpit', false],
    ['forward_hatch', 'Forward Hatch', false],
  ],
  deck_side_decks_beam: [
    ['side_deck', 'Side Deck', false],
    ['chainplates_shroud_area', 'Chainplates/Shroud Area', false],
    ['beam_trampoline', 'Beam/Trampoline', false],
  ],
  deck_stern_transom_swim_platform: [
    ['transom', 'Transom', false],
    ['swim_platform', 'Swim Platform', false],
    ['boarding_ladder', 'Boarding Ladder', false],
    ['stern_rail_pushpit', 'Stern Rail/Pushpit', false],
  ],
  flybridge_upper_deck: [
    ['flybridge_helm', 'Flybridge Helm', false],
    ['flybridge_seating', 'Flybridge Seating', false],
    ['radar_arch_mast', 'Radar Arch/Mast', false],
    ['sun_deck', 'Sun Deck', false],
  ],
  rigging_sail_handling: [
    ['mast_base_step', 'Mast Base/Step', false],
    ['boom', 'Boom', false],
    ['mast_interior_compression_post', 'Mast Interior/Compression Post', false],
    ['standing_rigging', 'Standing Rigging', false],
    ['furler', 'Furler', false],
    ['spreaders', 'Spreaders', false],
  ],
  engine_machinery_space: [
    ['engine_bay', 'Engine Bay', false],
    ['saildrive_shaft_area', 'Saildrive/Shaft Area', false],
    ['generator_compartment', 'Generator Compartment', false],
    ['steering_gear_compartment', 'Steering Gear Compartment', false],
  ],
  storage_lazarette: [
    ['lazarette', 'Lazarette', false],
    ['sail_locker', 'Sail Locker', false],
    ['bosuns_locker', "Bosun's Locker", false],
    ['tender_garage', 'Tender Garage', false],
  ],
  bilge_underfloor: [
    ['forward_bilge', 'Forward Bilge', false],
    ['midships_bilge', 'Midships Bilge', false],
    ['aft_bilge', 'Aft Bilge', false],
    ['keel_sump_under_sole_storage', 'Keel Sump/Under-sole Storage', false],
  ],
};

function zoneAvailable(slug: string, vesselType: string): boolean {
  if (slug === 'flybridge_upper_deck') {
    return FLYBRIDGE.has(vesselType);
  }
  if (slug === 'rigging_sail_handling') {
    return RIGGING.has(vesselType);
  }
  return !!ZONE_LABELS[slug];
}

function subAvailable(zone: string, sub: string, vesselType: string): boolean {
  const known = (SUBS[zone] || []).some((item) => item[0] === sub);
  if (!known) {
    return false;
  }
  if (zone === 'saloon_living_area' && sub === 'bridgedeck_saloon') {
    return MULTIHULL.has(vesselType);
  }
  return true;
}

function hullApplicable(zone: string, vesselType: string): boolean {
  return MULTIHULL.has(vesselType) && HULL_ELIGIBLE.has(zone);
}

export function locationZoneIds(vesselType: string): string[] {
  return ZONE_ORDER.map((zone) => zone[0]).filter((slug) => zoneAvailable(slug, vesselType));
}

function zoneDisplay(slug: string): string {
  const label = ZONE_LABELS[slug] || '';
  return label.startsWith(DECK_PREFIX) ? label.slice(DECK_PREFIX.length) : label;
}

function generateLabel(zone: string, sub: string | null, hull: string | null): string {
  const zoneDisp = zoneDisplay(zone);
  const subRow = sub ? (SUBS[zone] || []).find((item) => item[0] === sub) : undefined;
  const subLabel = subRow ? subRow[1] : '';
  const generic = !!subRow && subRow[2];
  let core = zoneDisp;
  if (subLabel && !generic) {
    core = zoneDisp.toLowerCase().includes(subLabel.toLowerCase())
      ? subLabel
      : `${zoneDisp} ${LABEL_SEP} ${subLabel}`;
  }
  if (hull) {
    core = `${hull} ${LABEL_SEP} ${core}`.replace(/[\s\u2013]+$/u, '').trim();
  }
  return core.trim();
}

function labelIndex(vesselType: string): Record<string, string[]> {
  const index: Record<string, string[]> = {};
  for (const slug of locationZoneIds(vesselType)) {
    const subs = (SUBS[slug] || [])
      .filter((item) => subAvailable(slug, item[0], vesselType))
      .map((item) => item[0]);
    subs.push('');
    const hulls: Array<string | null> = [null];
    if (hullApplicable(slug, vesselType)) {
      hulls.push(HULL_SIDES[0], HULL_SIDES[1]);
    }
    for (const sub of subs) {
      for (const hull of hulls) {
        const label = generateLabel(slug, sub || null, hull);
        if (!label) {
          continue;
        }
        const zones = index[label] || [];
        if (zones.indexOf(slug) === -1) {
          zones.push(slug);
        }
        index[label] = zones;
      }
    }
  }
  return index;
}

export function matchLocationZone(location: string, vesselType: string): string | null {
  return matchAgainst(location, labelIndex(vesselType));
}

function matchAgainst(location: string, labels: Record<string, string[]>): string | null {
  const raw = (location || '').trim();
  if (!raw) {
    return null;
  }
  const candidates = [raw];
  if (raw.endsWith(')') && raw.indexOf(' (') !== -1) {
    const prefix = raw.slice(0, raw.lastIndexOf(' ('));
    if (prefix) {
      candidates.push(prefix);
    }
  }
  for (const candidate of candidates) {
    const zones = labels[candidate];
    if (!zones || !zones.length) {
      continue;
    }
    return zones.length === 1 ? zones[0] : null;
  }
  return null;
}

export function buildWhereIndex(
  systems: Record<string, WhereSystem>,
  systemIds: string[],
  vesselType: string,
): WhereIndex {
  const labels = labelIndex(vesselType);
  const items: WhereItem[] = [];
  for (const systemId of systemIds) {
    const system = systems[systemId];
    if (!system) {
      continue;
    }
    const sections = system.sections || [];
    for (let sectionIndex = 0; sectionIndex < sections.length; sectionIndex += 1) {
      const section = sections[sectionIndex];
      if (section.type !== 'equipment_locations') {
        continue;
      }
      let previous = '';
      for (const row of section.rows || []) {
        let name = (row.name || '').trim();
        const location = (row.location || '').trim();
        if (name) {
          previous = name;
        } else if (previous) {
          name = previous;
        }
        if (!name || !location) {
          continue;
        }
        items.push({
          name,
          location,
          zone: matchAgainst(location, labels),
          systemId,
          sectionIndex,
        });
      }
    }
  }
  const present = new Set(items.map((item) => item.zone).filter((zone): zone is string => !!zone));
  const zones = locationZoneIds(vesselType)
    .filter((slug) => present.has(slug))
    .map((slug) => ({ id: slug, label: ZONE_LABELS[slug] || slug }));
  return { items, zones };
}

export function resolveWhereIndex(
  stored: WhereIndex | undefined,
  systems: Record<string, WhereSystem>,
  systemIds: string[],
  vesselType: string,
): WhereIndex {
  if (stored && Array.isArray(stored.items)) {
    return stored;
  }
  return buildWhereIndex(systems, systemIds, vesselType);
}
