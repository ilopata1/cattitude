import { Component, OnInit } from '@angular/core';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { InstrumentMapService } from '../../core/services/instrument-map.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

/**
 * SailPage — native instruments using Skip wind-steer visuals (MIT) and
 * vessel-specific Signal-K path mappings from the Cattitude backend.
 */
@Component({
  selector: 'app-sail',
  templateUrl: './sail.page.html',
  styleUrls: ['./sail.page.scss'],
  standalone: false,
})
export class SailPage implements OnInit {

  hasSignalKUrl = false;

  constructor(
    private readonly skSettings: SignalKSettingsService,
    private readonly instrumentMaps: InstrumentMapService,
    readonly routes: VesselRouteService,
  ) {}

  ngOnInit(): void {
    this.skSettings.url$.subscribe(url => {
      this.hasSignalKUrl = !!url;
    });
    void this.instrumentMaps.ensureLoaded();
  }
}
