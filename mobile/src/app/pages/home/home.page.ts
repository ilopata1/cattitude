import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { resolveLearnPath } from '../../core/guide/learn-path';
import { ContentService } from '../../core/services/content.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  constructor(
    public readonly content: ContentService,
    private readonly router: Router,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  get ruleSections() {
    return this.content.bootstrap.ui.homeRuleSections;
  }

  get showLearn(): boolean {
    const ui = this.content.bootstrap.ui;
    return (
      resolveLearnPath(ui.learnPath, ui.systemOrder, Object.keys(this.content.bootstrap.checklists))
        .length > 0
    );
  }

  openLearn(): void {
    void this.vesselRoutes.navigateTabs('do', 'learn');
  }

  openRuleLink(link: string | undefined): void {
    if (link) {
      void this.router.navigateByUrl(link);
    }
  }
}
