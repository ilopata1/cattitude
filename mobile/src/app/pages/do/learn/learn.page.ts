import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';
import { LearnCheck, SystemModule } from '../../../core/models/bootstrap-content.model';

@Component({
  selector: 'app-learn',
  templateUrl: './learn.page.html',
  styleUrls: ['./learn.page.scss'],
  standalone: false,
})
export class LearnPage {
  openId: string | null = null;

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly location: Location,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  get systems(): SystemModule[] {
    return this.content.getSystemsOrdered();
  }

  get progressState() {
    return this.progress.learnProgress();
  }

  toggleOpen(id: string): void {
    this.openId = this.openId === id ? null : id;
  }

  toggleDone(system: SystemModule, event: Event): void {
    event.stopPropagation();
    this.progress.toggleSystem(system);
  }

  isDone(system: SystemModule): boolean {
    return this.progress.isSystemDone(system);
  }

  toggleCheck(system: SystemModule, check: string | LearnCheck): void {
    this.progress.toggleCheck(system, check);
  }

  isCheckDone(system: SystemModule, check: string | LearnCheck): boolean {
    return this.progress.isCheckDone(system, check);
  }

  checkText(check: string | LearnCheck): string {
    return typeof check === 'string' ? check : check.text;
  }

  openSystemDetail(id: string, event: Event): void {
    event.stopPropagation();
    void this.vesselRoutes.navigateTabsWithExtras(['know'], {
      queryParams: { system: id },
    });
  }

  back(): void {
    this.location.back();
  }
}
