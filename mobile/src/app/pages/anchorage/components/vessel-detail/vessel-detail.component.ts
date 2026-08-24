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

  get lastUpdateAge(): string {
    if (!this.vessel) return '—';
    const sec = Math.round((Date.now() - this.vessel.lastUpdated) / 1000);
    if (sec < 60) return `${sec}s ago`;
    if (sec < 3600) return `${Math.round(sec / 60)}m ago`;
    return `${Math.round(sec / 3600)}h ago`;
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
      case 'green': return '#2ecc71';
      case 'amber': return '#f39c12';
      case 'red': return '#e74c3c';
      case 'moving': return '#3498db';
      default: return '#95a5a6';
    }
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
