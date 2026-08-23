import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AnchorageAlert } from '../../core/models/anchorage.model';

@Component({
  selector: 'app-anchorage-alert-banner',
  templateUrl: './alert-banner.component.html',
  styleUrls: ['./alert-banner.component.scss'],
  standalone: false,
})
export class AnchorageAlertBannerComponent {
  @Input() alerts: AnchorageAlert[] = [];
  @Output() alertTapped = new EventEmitter<AnchorageAlert>();

  get topAlert(): AnchorageAlert | null {
    const red = this.alerts.find(a => a.state === 'red');
    return red || this.alerts[0] || null;
  }

  get alertMessage(): string {
    if (!this.topAlert) return '';
    if (this.topAlert.type === 'collision') {
      return `Collision risk: ${this.topAlert.vesselName} and ${this.topAlert.otherName}`;
    }
    return `Rode conflict: ${this.topAlert.vesselName} near ${this.topAlert.otherName}`;
  }

  get alertColor(): string {
    return this.topAlert?.state === 'red' ? '#e74c3c' : '#f39c12';
  }

  onTap(): void {
    if (this.topAlert) this.alertTapped.emit(this.topAlert);
  }
}
