import { Component, OnDestroy, OnInit } from '@angular/core';
import { Subscription } from 'rxjs';
import { ContentService } from '../../../core/services/content.service';
import { EmergencyService } from '../../../core/services/emergency.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: false,
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  emergencyOpen = false;
  private emergencySub?: Subscription;

  constructor(
    public readonly content: ContentService,
    private readonly emergency: EmergencyService,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  ngOnInit(): void {
    this.emergencySub = this.emergency.open$.subscribe(() => {
      this.emergencyOpen = true;
    });
  }

  ngOnDestroy(): void {
    this.emergencySub?.unsubscribe();
  }

  goHome(): void {
    void this.vesselRoutes.navigateTabs('home');
  }

  openEmergency(): void {
    this.emergencyOpen = true;
  }

  closeEmergency(): void {
    this.emergencyOpen = false;
  }
}
