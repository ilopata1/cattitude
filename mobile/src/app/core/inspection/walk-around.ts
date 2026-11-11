/**
 * Supernova daily walk-around.
 * A few lines in the source photo were cut off at the right edge; those are
 * completed from the words that were visible.
 */

export interface WalkItem {
  id: string;
  text: string;
}

export interface WalkGroup {
  title: string;
  intro?: string;
  items: WalkItem[];
}

export const WALK_AROUND_INTRO =
  'This should be done each day around 12:00 — ideally at a consistent time and in manageable conditions. Wear a lifejacket and harness, clip on if necessary before going forward, and have another crew member keep watch.';

export const WALK_AROUND_WARNING =
  "Don't go on deck or open an engine compartment if conditions make it unsafe.";

export const WALK_AROUND: WalkGroup[] = [
  {
    title: 'Before going on deck',
    items: [
      { id: 'before-tell', text: "Tell the watchkeeper you're starting the round and where you'll be." },
      { id: 'before-conditions', text: 'Check the current conditions: wind, sea state, rain, visibility and movement of the boat.' },
      { id: 'before-footwear', text: 'Put on suitable footwear, lifejacket and harness.' },
      { id: 'before-clip', text: 'Clip onto the jackline before leaving the cockpit and keep a hand free for the boat.' },
      { id: 'before-torch', text: 'Take a torch for dark spaces and a phone or radio if that is part of your onboard procedure.' },
      { id: 'before-alone', text: "Don't go alone into an engine space or other confined area." },
    ],
  },
  {
    title: 'Cockpit and helm',
    items: [
      { id: 'cockpit-helms', text: 'Check both helms, wheels and steering response for unusual play, stiffness, noise or vibration.' },
      { id: 'cockpit-pilot', text: 'Check the autopilot is holding course normally; note alarms, heat or unusual noise.' },
      { id: 'cockpit-lines', text: 'Look over sheets, reefing lines, halyards and furling lines for chafe, knots, tangles or loose tails.' },
      { id: 'cockpit-winches', text: 'Check clutches, winches and blocks for visible damage, looseness or abnormal movement.' },
      { id: 'cockpit-drains', text: 'Confirm cockpit drains are clear.' },
      { id: 'cockpit-hatches', text: 'Check hatches, doors and lockers are dogged or secured as appropriate.' },
      { id: 'cockpit-gear', text: 'Check that loose gear, lines and safety equipment are secured.' },
      { id: 'cockpit-instruments', text: 'Note instruments and alarms; note anything different from normal.' },
    ],
  },
  {
    title: 'Deck and rig',
    intro: "Make a visual check from safe positions. Don't climb the mast or lean out to reach fittings.",
    items: [
      { id: 'deck-mast', text: 'Scan the mast, boom, standing rigging and accessible terminals for anything loose, bent, cracked or newly shiny from movement.' },
      { id: 'deck-wire', text: 'Look for broken strands, kinks, corrosion or unusual movement in accessible wire rigging.' },
      { id: 'deck-running', text: 'Check running rigging for chafe, flattened spots, glazing, cuts or parted stitching.' },
      { id: 'deck-blocks', text: 'Check blocks and sheaves for damage, seized movement, unusual noise or lines riding incorrectly.' },
      { id: 'deck-reefing', text: 'Check reefing gear, cars, tracks, travellers and stoppers for unexpected movement or damage.' },
      { id: 'deck-sails', text: 'Look over the mainsail, headsail and any other sail in use for tears, chafe, loose stitching or damage at the reef points and corners.' },
      { id: 'deck-covers', text: 'Check guards and sail covers for unusual movement, loose parts or signs of chafe.' },
      { id: 'deck-bowsprit', text: "Inspect the bowsprit and its visible fittings, plus any deployed sail's tack and control lines." },
      { id: 'deck-lifelines', text: 'Check guardrails and stanchions, lifelines, jacklines and attachment points for damage or looseness.' },
      { id: 'deck-trampolines', text: 'Check trampolines and their lashing or attachment points for wear, looseness or damage.' },
      { id: 'deck-hatches', text: 'Look over deck hatches, windows, vents and seals for leaks or signs of movement.' },
      { id: 'deck-anchor', text: 'Check the anchor and other heavy deck gear are secured.' },
      { id: 'deck-noise', text: 'Look for anything newly loose, displaced or making noise as the boat moves.' },
    ],
  },
  {
    title: 'Hulls, bilges and through-hulls',
    intro: 'Inspect both sides of the boat, comparing port and starboard.',
    items: [
      { id: 'hull-bilge', text: 'Check accessible bilges for unexpected water, oil, fuel, debris or a new smell.' },
      { id: 'hull-level', text: 'Note the water level and whether it has changed since the previous check.' },
      { id: 'hull-pumps', text: 'Check bilge-pump indicators or alarms show normal operation.' },
      { id: 'hull-cycling', text: "Investigate repeated pump cycling or a rising bilge level personally; don't just pump and move on." },
      { id: 'hull-leaks', text: 'Look for leaks around accessible hoses, seacocks, through-hulls, strainers and pumps.' },
      { id: 'hull-hoses', text: 'Check accessible hose connections for movement, chafe, cracking or corrosion.' },
      { id: 'hull-smell', text: 'Look and smell for fuel, exhaust, burning insulation or electrical concerns.' },
      { id: 'hull-drips', text: 'Look for new drips, dampness or unusual heat in lockers and technical spaces.' },
      { id: 'hull-compare', text: 'Compare both hulls for any difference in water, temperature, smell or noise.' },
    ],
  },
  {
    title: 'Engine spaces and sail drives',
    intro: 'Check both sides. Be cautious around hot surfaces and moving parts. Follow the engine manual, especially for checking fluids.',
    items: [
      { id: 'engine-leaks', text: 'Look for oil, coolant or seawater leaks.' },
      { id: 'engine-smells', text: 'Look for new smells, smoke, residue, unusual heat, noise or vibration.' },
      { id: 'engine-belts', text: 'Look over visible belts, hoses, clamps and wiring for damage, chafe or movement.' },
      { id: 'engine-mounts', text: 'Check engine mounts and nearby fittings visually for obvious change or looseness.' },
      { id: 'engine-bilge', text: 'Check the bilge beneath each engine for unexpected fluid or water.' },
      { id: 'engine-saildrive', text: 'Look around each saildrive for signs of leakage or damage.' },
      { id: 'engine-hours', text: 'Check engine hours and record them if an engine has been used.' },
      { id: 'engine-running', text: 'If an engine is running, check its gauges and alarms and confirm cooling-water discharge as described in the engine manual.' },
      { id: 'engine-hands', text: "Don't reach near belts, fans or other moving parts while an engine is running." },
    ],
  },
  {
    title: 'Navigation, communications and safety readiness',
    items: [
      { id: 'nav-position', text: 'Check position, course and speed against the passage plan.' },
      { id: 'nav-weather', text: 'Check the weather forecast and compare it with what the boat is experiencing.' },
      { id: 'nav-lights', text: "Check navigation lights are operating when required, using the boat's normal procedure." },
      { id: 'nav-vhf', text: 'Confirm the watch can reach the VHF and knows how to raise an alarm.' },
      { id: 'nav-safety', text: 'Confirm that lifejackets, harnesses, tethers and essential safety equipment remain accessible and secured.' },
      { id: 'nav-gear', text: 'Note any equipment used, moved or needing attention.' },
    ],
  },
  {
    title: 'Crew and log',
    items: [
      { id: 'crew-warm', text: 'Check that crew are warm, hydrated and functioning safely.' },
      { id: 'crew-ask', text: 'Ask the watchkeeper about new sounds, alarms, defects or changes in how the boat is sailing.' },
      { id: 'crew-log', text: 'Record the date and time, position, weather, engine hours, bilge observations and any defects.' },
      { id: 'crew-defects', text: 'Assign an owner and a follow-up time to each defect, and tell the skipper promptly about anything safety-critical.' },
    ],
  },
];

export function walkItemIds(): string[] {
  const ids: string[] = [];
  for (const group of WALK_AROUND) {
    for (const item of group.items) {
      ids.push(item.id);
    }
  }
  return ids;
}
