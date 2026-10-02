import { DEFAULT_SAIL_PLAN } from '../services/sail-plan-default';
import { normalizeSailConfiguration, sailConfigurationOptions, sailPlansDiffer } from './current-sail';

export function currentSailFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const options = sailConfigurationOptions(DEFAULT_SAIL_PLAN);
  expect(options.includes('Main'), 'inventory sails are choices');
  expect(options.includes('Main + self-tacking jib'), 'cell recommendations are choices');
  expect(options.filter((option) => option === 'Main + self-tacking jib').length === 1, 'duplicate recommendations collapse');
  expect(normalizeSailConfiguration('  Main   + Jib ') === 'main + jib', 'comparison ignores case and spacing');
  expect(!sailPlansDiffer('', 'Main + jib'), 'a blank current sail does not alert');
  expect(!sailPlansDiffer('Main + jib', '  main +   jib '), 'the same configuration does not alert');
  expect(sailPlansDiffer('Code 0', 'Main + self-tacking jib'), 'a different recommendation alerts');
  return failures;
}
