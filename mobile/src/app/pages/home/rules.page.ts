import { Component, inject } from '@angular/core';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-rules',
  templateUrl: './rules.page.html',
  styleUrls: ['./rules.page.scss'],
  standalone: false,
})
export class RulesPage {
  private readonly routes = inject(VesselRouteService);

  back(): void {
    void this.routes.navigateTabs('home');
  }
}
