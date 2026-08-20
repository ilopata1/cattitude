import { Component, OnDestroy, OnInit } from '@angular/core';
import { DomSanitizer, SafeResourceUrl } from '@angular/platform-browser';
import { Subscription } from 'rxjs';
import { SkipBridgeService } from '../../core/services/skip-bridge.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import { environment } from '../../../environments/environment';

/**
 * SailPage — hosts the Skip instrument panel in a same-origin iframe.
 *
 * Skip is built as a separate Angular application served under /skip/
 * (dev: http://localhost:4201, prod: same origin under /skip/).
 *
 * Before mounting the iframe, SkipBridgeService writes the Signal-K URL into
 * Skip's localStorage key (skip.connectionConfig) so Skip connects
 * automatically without a separate setup step.
 *
 * The iframe is only shown when a Signal-K URL is configured. When no URL is
 * set, a prompt to go to Settings is shown instead.
 */
@Component({
  selector: 'app-sail',
  templateUrl: './sail.page.html',
  styleUrls: ['./sail.page.scss'],
  standalone: false,
})
export class SailPage implements OnInit, OnDestroy {

  skipUrl: SafeResourceUrl | null = null;
  hasSignalKUrl = false;

  private subs: Subscription[] = [];

  constructor(
    private readonly sanitizer: DomSanitizer,
    private readonly bridge: SkipBridgeService,
    private readonly skSettings: SignalKSettingsService,
    private readonly sk: SignalKService,
    readonly routes: VesselRouteService,
  ) {}

  ngOnInit(): void {
    this.subs.push(
      this.skSettings.url$.subscribe(url => {
        this.hasSignalKUrl = !!url;
        if (url) {
          this.bridge.syncConnectionConfig();
          this.skipUrl = this.buildSkipUrl(url);
        } else {
          this.skipUrl = null;
        }
      }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  private buildSkipUrl(signalKUrl: string): SafeResourceUrl {
    const iframeUrl = this.bridge.buildSkipIframeUrl(
      signalKUrl,
      environment.skipUrl ?? '/cattitude/@halos-org/skip/',
    );
    return this.sanitizer.bypassSecurityTrustResourceUrl(iframeUrl);
  }
}
