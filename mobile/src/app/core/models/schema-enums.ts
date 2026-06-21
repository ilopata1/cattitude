/** Mirrors Postgres ENUM types from clever-sailor-data-model.md */

export type VesselType =
  | 'sailing_catamaran'
  | 'cruising_monohull'
  | 'sailing_trimaran'
  | 'power_catamaran'
  | 'motor_yacht'
  | 'sport_fishing';

export type SystemCategory =
  | 'propulsion'
  | 'fuel_system'
  | 'electrical_dc'
  | 'electrical_ac_shore_power'
  | 'freshwater_system'
  | 'sanitation'
  | 'bilge_and_drainage'
  | 'steering'
  | 'anchoring_ground_tackle'
  | 'rigging_sail_handling'
  | 'sails'
  | 'navigation_electronics'
  | 'communications'
  | 'refrigeration_galley'
  | 'hvac_climate'
  | 'safety_equipment'
  | 'tenders_davits'
  | 'stabilisation'
  | 'entertainment_connectivity'
  | 'hull_and_structure';

export type EquipmentClass =
  | 'branded_major'
  | 'branded_minor'
  | 'generic_hardware'
  | 'built_installed'
  | 'structural_fixed'
  | 'consumable_dated';

export type Zone =
  | 'bow_foredeck'
  | 'helm_station'
  | 'cockpit_aft_deck'
  | 'saloon_main_cabin'
  | 'galley'
  | 'engine_room'
  | 'lazarette_aft_storage'
  | 'swim_platform_transom'
  | 'below_decks_bilge'
  | 'port_hull'
  | 'starboard_hull'
  | 'bridgedeck_coachroof'
  | 'trampoline_foredeck_netting'
  | 'mast_base_deck_step'
  | 'keel_centreboard_trunk'
  | 'quarter_berth_aft_cabin'
  | 'flybridge'
  | 'engine_room_walkin'
  | 'bait_tackle_station';
