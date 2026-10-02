import { resolveUiIcon } from './ui-icons';

export function uiIconFailures(): string[] {
  const failures: string[] = [];
  const expect = (condition: boolean, message: string) => {
    if (!condition) {
      failures.push(message);
    }
  };
  const ion = (icon: string | undefined, fallback = 'ellipse-outline') => {
    const resolved = resolveUiIcon(icon, fallback);
    return resolved.kind === 'ion' ? resolved.name : '';
  };

  expect(ion('📘') === 'book-outline', 'book emoji');
  expect(ion('🛟') === 'help-buoy-outline', 'life ring');
  expect(ion('⚓') === 'anchor-outline', 'anchor uses the custom glyph');
  expect(ion('🌡') === 'thermometer-outline', 'thermometer emoji is an icon, not a warning');
  expect(ion('🌡️') === 'thermometer-outline', 'thermometer with variation selector');
  expect(ion('thermostat') === 'thermometer-outline', 'material thermostat');
  expect(ion('BatteryAlert') === 'battery-dead-outline', 'camel-case material name');
  expect(ion('book-outline') === 'book-outline', 'ionicon names pass through');
  expect(ion('NotAnIcon', 'build-outline') === 'build-outline', 'unknown names use the fallback');
  expect(ion(undefined, 'build-outline') === 'build-outline', 'empty uses the fallback');

  const custom = resolveUiIcon('🎃', 'ellipse-outline');
  expect(custom.kind === 'emoji' && custom.text === '🎃', 'unmapped emoji stays owner content');

  return failures;
}
