import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { InstrumentLiveService } from '../../core/services/instrument-live.service';
import { EMPTY_SAIL_ESSENTIALS } from '../../core/models/instrument-map.model';

@Component({
  selector: 'app-sail-essentials',
  standalone: true,
  imports: [IonicModule],
  templateUrl: './sail-essentials.component.html',
  styleUrls: ['./sail-essentials.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SailEssentialsComponent {
  private readonly live = inject(InstrumentLiveService);
  protected readonly essentials = toSignal(this.live.essentials$, { initialValue: EMPTY_SAIL_ESSENTIALS });

  formatDepth(m: number | null): string {
    return m === null ? '—' : `${m.toFixed(1)} m`;
  }

  formatSpeed(kn: number | null, source: 'stw' | 'sog' | null): string {
    if (kn === null) return '—';
    const label = source === 'sog' ? 'SOG' : source === 'stw' ? 'STW' : '';
    return label ? `${kn.toFixed(1)} kn ${label}` : `${kn.toFixed(1)} kn`;
  }
}
