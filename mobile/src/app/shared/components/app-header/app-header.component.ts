import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
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
  /** Page name on the second row. Omit on tab roots. */
  @Input() title = '';
  @Input() subtitle = '';
  /** Show the back control. Also shown when `backTo` is set. */
  @Input() showBack = false;
  /**
   * Parent route under the vessel tabs, used when this page was opened
   * directly. Example: `more` or `more/settings`.
   */
  @Input() backTo: string | null = null;
  /** When a parent listens, back uses that handler instead of history. */
  @Output() back = new EventEmitter<void>();

  emergencyOpen = false;
  private emergencySub?: Subscription;

  constructor(
    public readonly content: ContentService,
    private readonly emergency: EmergencyService,
    private readonly vesselRoutes: VesselRouteService,
    private readonly location: Location,
    private readonly router: Router,
  ) {}

  ngOnInit(): void {
    this.emergencySub = this.emergency.open$.subscribe(() => {
      this.emergencyOpen = true;
    });
  }

  ngOnDestroy(): void {
    this.emergencySub?.unsubscribe();
  }

  get hasSubheader(): boolean {
    return !!(this.title || this.subtitle || this.showBackControl);
  }

  get showBackControl(): boolean {
    return this.showBack || !!this.backTo;
  }

  goHome(): void {
    void this.vesselRoutes.navigateTabs('home');
  }

  onBack(): void {
    if (this.back.observed) {
      this.back.emit();
      return;
    }
    const previous = this.router.lastSuccessfulNavigation?.previousNavigation;
    if (previous) {
      this.location.back();
      return;
    }
    const segments = (this.backTo ?? '')
      .split('/')
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
    if (segments.length) {
      void this.vesselRoutes.navigateTabs(...segments);
    }
  }

  openEmergency(): void {
    this.emergencyOpen = true;
  }

  closeEmergency(): void {
    this.emergencyOpen = false;
  }
}
