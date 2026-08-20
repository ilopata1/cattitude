import { SailPlan, SailPlanCell } from '../models/sail-plan.model';

function cell(primary: string, alternatives: string[] = [], notes?: string, avoid?: string): SailPlanCell {
  return { primary, alternatives, notes, avoid };
}

/**
 * Seeded from the Outremer 55 Incidence crossover chart (Supernova).
 * Owners should treat this as a starting template and edit bands/sails for their vessel.
 */
export const DEFAULT_SAIL_PLAN: SailPlan = {
  name: 'Outremer 55 (template)',
  sails: [
    'Main',
    'Self-tacking jib',
    'Code 0',
    'Gennaker',
    'A2',
    'S4',
  ],
  twaCuts: [0, 55, 75, 95, 115, 140, 165, 180],
  twsCuts: [0, 8, 12, 18, 24, 30],
  cells: [
    // 0–55 TWA
    [
      cell('Main + self-tacking jib'),
      cell('Main + self-tacking jib'),
      cell('Main + self-tacking jib'),
      cell('1 reef + self-tacking jib'),
      cell('2 reefs + self-tacking jib'),
    ],
    // 55–75
    [
      cell('Code 0', ['Jib']),
      cell('Code 0'),
      cell('Code 0', ['Jib'], 'Code 0 → jib crossover'),
      cell('Jib'),
      cell('Reefed main + jib'),
    ],
    // 75–95
    [
      cell('Code 0'),
      cell('Code 0'),
      cell('Gennaker', ['Code 0']),
      cell('Gennaker', ['Jib']),
      cell('Reefed main + jib'),
    ],
    // 95–115
    [
      cell('Code 0', ['Gennaker']),
      cell('Gennaker'),
      cell('Gennaker', ['A2']),
      cell('A2', ['Gennaker']),
      cell('Reefed main + jib', ['Small S4'], 'S4 only if very controlled'),
    ],
    // 115–140
    [
      cell('Gennaker', ['A2']),
      cell('A2'),
      cell('A2'),
      cell('A2', ['S4']),
      cell('S4'),
    ],
    // 140–165
    [
      cell('A2'),
      cell('A2'),
      cell('A2'),
      cell('S4', ['A2']),
      cell('S4'),
    ],
    // 165–180
    [
      cell('A2', [], 'Hotter angles usually faster'),
      cell('A2', [], 'Hotter angles usually faster'),
      cell('A2', [], 'Hotter angles usually faster'),
      cell('S4', ['A2'], 'Hotter angles usually faster'),
      cell('S4', [], 'Hotter angles usually faster'),
    ],
  ],
  heavyWeather: {
    enabled: true,
    twsFrom: 30,
    twaCuts: [0, 80, 120, 165, 180],
    cells: [
      cell('2–3 reefs + self-tacking jib', [], undefined, 'Code 0'),
      cell('2–3 reefs + self-tacking jib', [], undefined, 'Gennaker; Code 0'),
      cell(
        '2–3 reefs + main-only or small jib; sail hotter and gybe',
        [],
        undefined,
        'A2 except in unusually controlled conditions; S4 only if specifically set up and stable',
      ),
      cell(
        'Do not press dead downwind; gybe through hotter angles',
        [],
        undefined,
        'Large free-flying sails unless the crew is fully in control',
      ),
    ],
  },
  notes:
    'Code 0 is a light-air close-reaching engine — be conservative as load builds. ' +
    'A2 is the default runner; S4 is the heavy-air specialist. ' +
    'Over 30 kn, control comes before sail choice: reef earlier and favour hot angles.',
};
