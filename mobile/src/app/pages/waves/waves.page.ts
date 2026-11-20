import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { WaveMonitorState, WaveEstimatorService } from '../../core/services/wave-estimator.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import {
  formatFrom,
  formatMetres,
  formatSeconds,
  seaStateLabel,
} from '../../core/waves/wave-estimator';

@Component({
  selector: 'app-waves',
  templateUrl: './waves.page.html',
  styleUrls: ['./waves.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'helm-screen' },
  standalone: false,
})
export class WavesPage implements OnInit, OnDestroy {
  state: WaveMonitorState = {
    collectedS: 0,
    windowS: 1200,
    estimate: null,
    connected: false,
  };

  private readonly waves = inject(WaveEstimatorService);
  private readonly sk = inject(SignalKService);
  private readonly routes = inject(VesselRouteService);
  private readonly router = inject(Router);
  private readonly cdr = inject(ChangeDetectorRef);
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.state = this.waves.current;
    this.subs.push(
      this.waves.state$.subscribe((state) => {
        this.state = state;
        this.cdr.markForCheck();
      }),
      this.sk.connected$.subscribe((connected) => {
        this.state = { ...this.state, connected };
        this.cdr.markForCheck();
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach((sub) => sub.unsubscribe());
  }

  get openedFromMore(): boolean {
    return this.router.url.includes('/more/waves');
  }

  get settingsLink(): string[] {
    return this.routes.tabs('more', 'settings');
  }

  height(): string {
    return formatMetres(this.state.estimate?.status === 'ok' ? this.state.estimate.hs : null);
  }

  period(): string {
    return formatSeconds(this.state.estimate?.status === 'ok' ? this.state.estimate.tpTrue : null);
  }

  encounter(): string {
    return formatSeconds(this.state.estimate?.status === 'ok' ? this.state.estimate.tpEncounter : null);
  }

  direction(): string {
    const estimate = this.state.estimate;
    if (!estimate || estimate.status !== 'ok') return '—';
    if (estimate.ambiguous) return 'Two ways';
    return formatFrom(estimate.dirFromTrue);
  }

  sea(): string {
    const estimate = this.state.estimate;
    if (!estimate || estimate.status !== 'ok' || estimate.ambiguous) return '';
    return seaStateLabel(estimate.dirTravelBow);
  }

  confidence(): string {
    const value = this.state.estimate?.confidence;
    if (!value || value === 'none') return '';
    return value.charAt(0).toUpperCase() + value.slice(1);
  }

  progress(): string {
    const estimate = this.state.estimate;
    if (estimate?.status === 'skipped' && estimate.reason) return estimate.reason;
    const have = Math.max(0, Math.round(this.state.collectedS / 60));
    const need = Math.max(1, Math.round(this.state.windowS / 60));
    if (have <= 0) return 'Waiting for pitch and roll';
    if (have < need) return `Collecting motion, ${have} of ${need} min`;
    if (!estimate) return 'Waiting for a steady heading';
    return '';
  }

  flags(): string[] {
    return this.state.estimate?.flags ?? [];
  }

  candidates(): string {
    const estimate = this.state.estimate;
    if (!estimate?.ambiguous || estimate.dirCandidates.length < 2) return '';
    return estimate.dirCandidates.map((dir) => formatFrom(dir)).join(' or ');
  }

  chop(): string {
    const index = this.state.estimate?.chopIndex;
    if (index == null || index < 0.25) return '';
    return 'Short chop is moving the boat faster than this band measures.';
  }

  method(): string {
    const estimate = this.state.estimate;
    if (!estimate || estimate.status !== 'ok') return '';
    if (estimate.hsHeave != null && estimate.hsSlope != null) {
      return `GPS height ${formatMetres(estimate.hsHeave)}, hull slope ${formatMetres(estimate.hsSlope)}`;
    }
    if (estimate.hsHeave != null) return 'From GPS height';
    if (estimate.hsSlope != null) return 'From pitch and roll. GPS height was not steady enough to use.';
    return '';
  }
}
