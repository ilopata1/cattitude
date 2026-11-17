/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import {
  CsGaugeZone,
  GAUGE,
  arcDashOffset,
  arcFraction,
  arcZonePath,
  formatGaugeValue,
} from './viz-geometry';

@Component({
  selector: 'cs-arc-gauge',
  standalone: true,
  templateUrl: './cs-arc-gauge.component.html',
  styleUrls: ['./cs-arc-gauge.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    role: 'meter',
    '[attr.aria-valuenow]': 'value()',
    '[attr.aria-valuemin]': 'min()',
    '[attr.aria-valuemax]': 'max()',
    '[attr.aria-valuetext]': 'picture().label',
  },
})
export class CsArcGaugeComponent {
  readonly value = input.required<number>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly zones = input<readonly CsGaugeZone[]>([]);

  protected readonly geom = GAUGE;
  protected readonly dash = `${GAUGE.arcLength} ${GAUGE.circumference}`;
  protected readonly arcTurn = `rotate(${GAUGE.start} ${GAUGE.cx} ${GAUGE.cy})`;

  protected readonly picture = computed(() => {
    const min = this.min();
    const max = this.max();
    const fraction = arcFraction(this.value(), min, max);
    const zones = this.zones()
      .map(zone => ({ tone: zone.tone, d: arcZonePath(zone.from, zone.to, min, max) }))
      .filter((zone): zone is { tone: CsGaugeZone['tone']; d: string } => zone.d != null);
    return {
      fraction,
      offset: arcDashOffset(fraction, GAUGE.arcLength),
      label: formatGaugeValue(this.value()),
      zones,
    };
  });
}
