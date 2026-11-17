/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { CsGaugeZone, levelFillWidth, levelZoneRect } from './viz-geometry';

@Component({
  selector: 'cs-level-bar',
  standalone: true,
  templateUrl: './cs-level-bar.component.html',
  styleUrls: ['./cs-level-bar.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[attr.role]': 'fill() == null ? null : "meter"',
    '[attr.aria-label]': 'label() || null',
    '[attr.aria-valuenow]': 'fill()',
    '[attr.aria-valuemin]': 'fill() == null ? null : 0',
    '[attr.aria-valuemax]': 'fill() == null ? null : 100',
    '[attr.aria-valuetext]': 'valueText()',
  },
})
export class CsLevelBarComponent {
  /** 0–100, or null when the level is unknown. */
  readonly fill = input<number | null>(null);
  readonly label = input('');
  readonly valueText = input<string | null>(null);
  readonly zones = input<readonly CsGaugeZone[]>([]);

  protected readonly fillWidth = computed(() => levelFillWidth(this.fill()));
  protected readonly zoneRects = computed(() => this.zones()
    .map(zone => {
      const rect = levelZoneRect(zone);
      return rect ? { ...rect, tone: zone.tone } : null;
    })
    .filter((zone): zone is { x: number; width: number; tone: CsGaugeZone['tone'] } => zone != null));
}
