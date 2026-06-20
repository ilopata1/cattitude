import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { LocationZone, SystemModule } from '../../core/models/bootstrap-content.model';

@Component({
  selector: 'app-know',
  templateUrl: './know.page.html',
  styleUrls: ['./know.page.scss'],
  standalone: false,
})
export class KnowPage implements OnInit {
  mode: 'topic' | 'location' = 'topic';
  selected: SystemModule | null = null;
  selectedZone: string | null = null;

  constructor(
    public readonly content: ContentService,
    private readonly route: ActivatedRoute,
    private readonly router: Router,
  ) {}

  get locationLayout() {
    return this.content.bootstrap.ui.locationLayout;
  }

  ngOnInit(): void {
    const systemId = this.route.snapshot.queryParamMap.get('system');
    if (systemId) {
      const system = this.content.getSystem(systemId);
      if (system) {
        this.selected = system;
      }
    }
  }

  setMode(mode: 'topic' | 'location'): void {
    this.mode = mode;
    this.selectedZone = null;
  }

  openSystem(system: SystemModule): void {
    this.selected = system;
  }

  closeDetail(): void {
    this.selected = null;
  }

  selectZone(zoneId: string): void {
    this.selectedZone = this.selectedZone === zoneId ? null : zoneId;
  }

  zoneSystems(zoneId: string): SystemModule[] {
    const zone: LocationZone | undefined = this.content.getLocationZone(zoneId);
    if (!zone) {
      return [];
    }
    return zone.sys
      .map((id) => this.content.getSystem(id))
      .filter((system): system is SystemModule => !!system);
  }

  zoneLabel(zoneId: string): string {
    return this.content.getLocationZone(zoneId)?.label ?? zoneId;
  }

  goToFix(): void {
    this.router.navigate(['/tabs/fix']);
  }
}
