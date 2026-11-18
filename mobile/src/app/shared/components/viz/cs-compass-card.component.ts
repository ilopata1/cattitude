/* eslint-disable @angular-eslint/component-selector */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  input,
  signal,
  untracked,
  WritableSignal,
} from '@angular/core';
import { normalizeAngleDeg, unwrapAngleDeg } from '../../../instruments/skip/wind-steer.util';
import {
  compassCogPoints,
  compassTicks,
  displayHeadingDeg,
  windSide,
  CompassTick,
} from './viz-geometry';

/**
 * Compass card. The card turns under a fixed lubber line; the boat does not.
 * The Sail page shows this when Dial style is Modern.
 *
 * `heading`, `cog`, and `twa` are compass degrees (`twa` matches `wind().twa`).
 * `awa` is degrees clockwise from the bow.
 */
@Component({
  selector: 'cs-compass-card',
  standalone: true,
  templateUrl: './cs-compass-card.component.html',
  styleUrls: ['./cs-compass-card.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsCompassCardComponent {
  readonly heading = input.required<number>();
  /** When false, the centre shows an em dash. The card still turns to `heading`. */
  readonly fresh = input(true);
  readonly cog = input<number | null>(null);
  readonly awa = input<number | null>(null);
  readonly twa = input<number | null>(null);

  protected readonly ticks: readonly CompassTick[] = compassTicks();
  protected readonly cardTurn = signal<number | null>(null);
  protected readonly awaTurn = signal<number | null>(null);
  protected readonly twaTurn = signal<number | null>(null);

  private readonly headingState = { ready: false, unwrapped: 0 };
  private readonly awaState = { ready: false, unwrapped: 0 };
  private readonly twaState = { ready: false, unwrapped: 0 };

  protected readonly headingLabel = computed(() => (
    this.fresh() ? displayHeadingDeg(this.heading()) : '—'
  ));
  protected readonly headingFinite = computed(() => this.fresh() && Number.isFinite(this.heading()));
  protected readonly cogPoints = computed(() => {
    const cog = this.cog();
    if (cog == null || !Number.isFinite(cog)) return null;
    return compassCogPoints(cog);
  });
  protected readonly awaSide = computed(() => windSide(this.awa()));
  protected readonly twaSide = computed(() => {
    const twa = this.twa();
    const heading = this.heading();
    if (twa == null || !Number.isFinite(twa) || !Number.isFinite(heading)) return 'ahead';
    return windSide(normalizeAngleDeg(twa - heading));
  });

  constructor() {
    effect(() => {
      const heading = this.heading();
      untracked(() => this.applyTurn(this.headingState, heading, this.cardTurn, true));
    });
    effect(() => {
      const awa = this.awa();
      untracked(() => this.applyTurn(this.awaState, awa, this.awaTurn, false));
    });
    effect(() => {
      const twa = this.twa();
      const heading = this.heading();
      const relative = twa == null || !Number.isFinite(twa) || !Number.isFinite(heading)
        ? null
        : normalizeAngleDeg(twa - heading);
      untracked(() => this.applyTurn(this.twaState, relative, this.twaTurn, false));
    });
  }

  private applyTurn(
    state: { ready: boolean; unwrapped: number },
    next: number | null,
    turn: WritableSignal<number | null>,
    invert: boolean,
  ): void {
    if (next == null || !Number.isFinite(next)) {
      turn.set(null);
      return;
    }
    state.unwrapped = state.ready ? unwrapAngleDeg(state.unwrapped, next) : normalizeAngleDeg(next);
    state.ready = true;
    turn.set(invert ? -state.unwrapped : state.unwrapped);
  }
}
