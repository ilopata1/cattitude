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
    '[attr.role]': 'showValue() ? "meter" : null',
    '[attr.aria-valuenow]': 'showValue() ? value() : null',
    '[attr.aria-valuemin]': 'showValue() ? min() : null',
    '[attr.aria-valuemax]': 'showValue() ? max() : null',
    '[attr.aria-valuetext]': 'showValue() ? picture().label : null',
  },
})
export class CsArcGaugeComponent {
  readonly value = input.required<number>();
  readonly min = input.required<number>();
  readonly max = input.required<number>();
  readonly zones = input<readonly CsGaugeZone[]>([]);
  /** Centre number. Off when the parent already shows the reading. */
  readonly showValue = input(true);

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
