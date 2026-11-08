import { Component, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { map } from 'rxjs';
import { emptyFuelCurve, fuelRangeView, FuelRangeView } from '../../core/fuel/fuel-range';
import { emptyFuelMotion } from '../../core/fuel/fuel-motion';
import { BatteryView, emptyLevels, levelGroups, LevelGroupView, TankView } from '../../core/levels/levels';
import { FuelCurveSettingsService } from '../../core/services/fuel-curve-settings.service';
import { FuelMotionService } from '../../core/services/fuel-motion.service';
import { LevelsService } from '../../core/services/levels.service';
import { SignalKService } from '../../core/services/signal-k.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-levels',
  templateUrl: './levels.page.html',
  styleUrls: ['./levels.page.scss'],
  standalone: false,
})
export class LevelsPage {
  private readonly levels = inject(LevelsService);
  private readonly settings = inject(SignalKSettingsService);
  private readonly sk = inject(SignalKService);
  private readonly fuelCurve = inject(FuelCurveSettingsService);
  private readonly fuelMotion = inject(FuelMotionService);
  readonly routes = inject(VesselRouteService);

  readonly state = toSignal(this.levels.state$, { initialValue: emptyLevels() });
  private readonly curve = toSignal(this.fuelCurve.settings$, { initialValue: this.fuelCurve.current });
  private readonly motion = toSignal(this.fuelMotion.state$, { initialValue: this.fuelMotion.current });
  readonly configured = toSignal(
    this.settings.url$.pipe(map((url) => !!url.trim())),
    { initialValue: !!this.settings.url.trim() },
  );
  readonly connection = toSignal(this.sk.state$, { initialValue: this.sk.state });

  groups(): LevelGroupView[] {
    return levelGroups(this.state());
  }

  range(): FuelRangeView {
    return fuelRangeView({
      curve: this.curve() ?? emptyFuelCurve(),
      engines: (this.motion() ?? emptyFuelMotion()).engines,
      sogKn: (this.motion() ?? emptyFuelMotion()).sogKn,
      tanks: this.state().tanks,
    });
  }

  rangeLabel(): string {
    const range = this.range();
    if (range.hours === '—') return `Fuel range. ${range.note}`;
    return `Fuel range. ${range.hours} left. ${range.distance}.`;
  }

  emptyMessage(): string {
    switch (this.connection()) {
      case 'connected':
        return 'No tank or battery readings yet.';
      case 'connecting':
        return 'Connecting to Signal K.';
      case 'error':
        return 'No live data.';
      default:
        return 'Signal K offline.';
    }
  }

  trackGroup(_: number, group: LevelGroupView): string {
    return group.id;
  }

  trackTank(_: number, tank: TankView): string {
    return tank.key;
  }

  trackBattery(_: number, battery: BatteryView): string {
    return battery.key;
  }
}
