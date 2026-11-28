import {
  ChangeDetectionStrategy,
  Component,
  computed,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { CsCompassCardComponent } from '../../shared/components/viz/cs-compass-card.component';
import { SvgWindsteerComponent } from './svg-windsteer.component';
import { DISPLAY_PUBLISH_MS } from '../../core/services/instrument-damping';
import { DialStyleService } from '../../core/services/dial-style.service';
import { InstrumentLiveService } from '../../core/services/instrument-live.service';
import { EMPTY_WIND_STEER } from '../../core/models/instrument-map.model';
import { displayCompass } from '../../core/nav/magnetic';

@Component({
  selector: 'app-wind-steer-panel',
  standalone: true,
  imports: [SvgWindsteerComponent, CsCompassCardComponent],
  templateUrl: './wind-steer-panel.component.html',
  styleUrls: ['./skip-instrument-theme.scss', './wind-steer-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindSteerPanelComponent {
  private readonly live = inject(InstrumentLiveService);
  protected readonly dialStyle = inject(DialStyleService);
  protected readonly wind = toSignal(this.live.wind$, { initialValue: EMPTY_WIND_STEER });
  /**
   * Heading, COG and wind direction against one north (magnetic when the boat
   * sends a variation). Shifting all three by the same amount keeps every
   * angle between them, so laylines and wind-off-the-bow draw as before.
   */
  protected readonly compass = computed(() => displayCompass(this.wind()));
  protected readonly displayPublishMs = DISPLAY_PUBLISH_MS;
  protected readonly NaN = Number.NaN;
}
