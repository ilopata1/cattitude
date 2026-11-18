/* eslint-disable @angular-eslint/component-selector */
import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { WIND_DIAL, windDialLayout } from './viz-geometry';

/**
 * North-up wind dial. The arc is the range encountered, the red dot is the
 * port extreme, the green dot is the starboard extreme, and the arrow is now.
 */
@Component({
  selector: 'cs-wind-dial',
  standalone: true,
  templateUrl: './cs-wind-dial.component.html',
  styleUrls: ['./cs-wind-dial.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { 'aria-hidden': 'true' },
})
export class CsWindDialComponent {
  /** Compass bearings, degrees clockwise from north. */
  readonly bearings = input<readonly number[]>([]);
  /** Current wind direction, compass degrees. Null hides the arrow. */
  readonly current = input<number | null>(null);
  /** Boat heading. Null hides the port and starboard markers. */
  readonly heading = input<number | null>(null);

  protected readonly geom = WIND_DIAL;
  /** Arrow is drawn pointing north, then rotated to `figure().current`. */
  protected readonly arrowHead =
    `${WIND_DIAL.cx - 5},${WIND_DIAL.cy - 16} ${WIND_DIAL.cx},${WIND_DIAL.cy - 26} ${WIND_DIAL.cx + 5},${WIND_DIAL.cy - 16}`;
  protected readonly figure = computed(() => windDialLayout(this.bearings(), this.current(), this.heading()));
}
