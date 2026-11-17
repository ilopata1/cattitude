/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { sparklineLayout } from './viz-geometry';

@Component({
  selector: 'cs-sparkline',
  standalone: true,
  templateUrl: './cs-sparkline.component.html',
  styleUrls: ['./cs-sparkline.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class CsSparklineComponent {
  readonly values = input.required<readonly number[]>();
  readonly min = input<number | null>(null);
  readonly max = input<number | null>(null);

  protected readonly figure = computed(() => sparklineLayout(this.values(), this.min(), this.max()));
}
