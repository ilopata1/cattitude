import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Vessel } from '../../core/models/vessel.model';

@Component({
  selector: 'app-anchorage-vessel-detail',
  templateUrl: './vessel-detail.component.html',
  styleUrls: ['./vessel-detail.component.scss'],
  standalone: false,
})
export class AnchorageVesselDetailComponent {
  @Input() vessel!: Vessel;
  @Output() dismiss = new EventEmitter<void>();

  get positionCount(): number {
    return this.vessel?.positions?.length || 0;
  }

  get isStale(): boolean {
    return this.vessel ? Date.now() - this.vessel.lastUpdated > 900_000 : false;
  }

  get anchorCoords(): string {
    if (!this.vessel?.anchorPoint) return 'Calculating…';
    return `${this.vessel.anchorPoint.lat.toFixed(6)}, ${this.vessel.anchorPoint.lon.toFixed(6)}`;
  }

  get stateLabel(): string {
    switch (this.vessel?.state) {
      case 'green': return 'Clear';
      case 'amber': return 'Rode Conflict';
      case 'red': return 'Collision Risk';
      case 'moving': return 'Moving';
      default: return 'Unknown';
    }
  }

  get stateColor(): string {
    switch (this.vessel?.state) {
      case 'green': return 'var(--cattitude-success)';
      case 'amber': return 'var(--cattitude-warning)';
      case 'red': return 'var(--cattitude-danger)';
      case 'moving': return 'var(--cattitude-info)';
      default: return 'var(--cattitude-text-light)';
    }
  }

  get stateTextColor(): string {
    const state = this.vessel?.state;
    if (state === 'green' || state === 'red') return 'var(--cattitude-text-on-fill)';
    return 'var(--cattitude-text-on-warning)';
  }

  get displayName(): string {
    const name = (this.vessel?.name ?? '').trim();
    if (name && name !== this.vessel.mmsi) {
      return name.toLowerCase().replace(/\b([a-z])/g, ch => ch.toUpperCase());
    }
    return `MMSI ${this.vessel.mmsi}`;
  }

  onDismiss(): void {
    this.dismiss.emit();
  }
}
