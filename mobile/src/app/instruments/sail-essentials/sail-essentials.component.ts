import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { IonicModule } from '@ionic/angular';
import { passageIsActive } from '../../core/logbook/logbook-math';
import { EMPTY_SAIL_ESSENTIALS, EMPTY_WIND_STEER } from '../../core/models/instrument-map.model';
import { emptyReading } from '../../core/models/logbook.model';
import { liveVmcKn, liveVmgKn } from '../../core/nav/made-good';
import { InstrumentHistoryService } from '../../core/services/instrument-history.service';
import { InstrumentLiveService } from '../../core/services/instrument-live.service';
import { LogbookSamplerService } from '../../core/services/logbook-sampler.service';
import { LogbookService } from '../../core/services/logbook.service';
import { CsSparklineComponent } from '../../shared/components/viz/cs-sparkline.component';
import { splitLiveReading } from '../../shared/reading-parts';

@Component({
  selector: 'app-sail-essentials',
  standalone: true,
  imports: [IonicModule, CsSparklineComponent],
  templateUrl: './sail-essentials.component.html',
  styleUrls: ['./sail-essentials.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SailEssentialsComponent {
  private readonly live = inject(InstrumentLiveService);
  private readonly history = inject(InstrumentHistoryService);
  private readonly logbook = inject(LogbookService);
  private readonly sampler = inject(LogbookSamplerService);
  protected readonly essentials = toSignal(this.live.essentials$, { initialValue: EMPTY_SAIL_ESSENTIALS });
  protected readonly wind = toSignal(this.live.wind$, { initialValue: EMPTY_WIND_STEER });
  protected readonly passage = toSignal(this.logbook.passage$, { initialValue: this.logbook.passage$.value });
  protected readonly fix = toSignal(this.sampler.reading$, { initialValue: emptyReading() });

  formatDepth(m: number | null): string {
    return m === null ? '—' : `${m.toFixed(1)} m`;
  }

  formatSpeed(kn: number | null, source: 'stw' | 'sog' | null): string {
    if (kn === null) return '—';
    const label = source === 'sog' ? 'SOG' : source === 'stw' ? 'STW' : '';
    return label ? `${kn.toFixed(1)} kn ${label}` : `${kn.toFixed(1)} kn`;
  }

  protected depthParts() {
    return splitLiveReading(this.formatDepth(this.essentials().depthM));
  }

  protected speedParts() {
    return splitLiveReading(this.formatSpeed(this.essentials().speedKn, this.essentials().speedSource));
  }

  protected vmgParts() {
    return splitLiveReading(this.formatKnots(liveVmgKn(this.essentials(), this.wind())));
  }

  protected vmcParts() {
    return splitLiveReading(this.formatKnots(liveVmcKn(
      this.essentials(),
      this.wind(),
      this.fix().position,
      this.passage(),
    )));
  }

  protected showVmc(): boolean {
    return passageIsActive(this.passage());
  }

  protected depthTrace(): readonly number[] {
    return this.history.history('depth');
  }

  protected speedTrace(): readonly number[] {
    return this.history.history('speed');
  }

  protected vmgTrace(): readonly number[] {
    return this.history.history('vmg');
  }

  protected vmcTrace(): readonly number[] {
    return this.history.history('vmc');
  }

  private formatKnots(kn: number | null): string {
    return kn == null ? '—' : `${kn.toFixed(1)} kn`;
  }
}
