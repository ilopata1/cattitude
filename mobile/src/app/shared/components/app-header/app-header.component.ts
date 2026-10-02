import { Location } from '@angular/common';
import { Component, EventEmitter, Input, OnDestroy, OnInit, Output } from '@angular/core';
import { Router } from '@angular/router';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { ContentService } from '../../../core/services/content.service';
import { EmergencyService } from '../../../core/services/emergency.service';
import { ReaderViewService } from '../../../core/services/reader-view.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';

const PERSONA_EXPLAINED = 'cattitude.readerView.explained';

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
  readonly emergencyBreakpoints = [0, 0.9];
  readonly emergencyInitial = 0.9;
  private emergencySub?: Subscription;

  constructor(
    public readonly content: ContentService,
    public readonly readerView: ReaderViewService,
    private readonly emergency: EmergencyService,
    private readonly vesselRoutes: VesselRouteService,
    private readonly location: Location,
    private readonly router: Router,
    private readonly alerts: AlertController,
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

  get readerLabel(): string {
    return this.readerView.view() === 'crew' ? 'Crew' : 'Guest';
  }

  goHome(): void {
    void this.vesselRoutes.navigateTabs('home');
  }

  async onPersona(): Promise<void> {
    if (!this.personaExplained()) {
      await this.explainPersona();
      return;
    }
    this.readerView.setView(this.readerView.view() === 'guest' ? 'crew' : 'guest');
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

  private personaExplained(): boolean {
    try {
      return localStorage.getItem(PERSONA_EXPLAINED) === '1';
    } catch {
      return true;
    }
  }

  private async explainPersona(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Guest or Crew',
      message:
        'Guest is the charter briefing. Crew adds owner notes, extra checks, and the fuller manual. The choice stays on this phone and changes Home, Know, and search.',
      buttons: [
        { text: 'Guest', handler: () => this.choosePersona('guest') },
        { text: 'Crew', handler: () => this.choosePersona('crew') },
      ],
    });
    await alert.present();
  }

  private choosePersona(view: 'guest' | 'crew'): void {
    this.readerView.setView(view);
    try {
      localStorage.setItem(PERSONA_EXPLAINED, '1');
    } catch {
      /* the explanation can show again if storage is blocked */
    }
  }
}
