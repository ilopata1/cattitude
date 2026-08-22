import {
  ChangeDetectionStrategy,
  Component,
  inject,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { SvgWindsteerComponent } from './svg-windsteer.component';
import { InstrumentLiveService } from '../../core/services/instrument-live.service';
import { EMPTY_WIND_STEER } from '../../core/models/instrument-map.model';

@Component({
  selector: 'app-wind-steer-panel',
  standalone: true,
  imports: [SvgWindsteerComponent],
  templateUrl: './wind-steer-panel.component.html',
  styleUrls: ['./skip-instrument-theme.scss', './wind-steer-panel.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WindSteerPanelComponent {
  private readonly live = inject(InstrumentLiveService);
  protected readonly wind = toSignal(this.live.wind$, { initialValue: EMPTY_WIND_STEER });
}
