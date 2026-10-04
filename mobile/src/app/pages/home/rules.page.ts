import { Component, inject } from '@angular/core';
import { HomeRuleSection } from '../../core/models/bootstrap-content.model';
import { ContentService } from '../../core/services/content.service';
import { ReaderViewService } from '../../core/services/reader-view.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-rules',
  templateUrl: './rules.page.html',
  styleUrls: ['./rules.page.scss'],
  standalone: false,
})
export class RulesPage {
  private readonly content = inject(ContentService);
  private readonly readerView = inject(ReaderViewService);
  private readonly routes = inject(VesselRouteService);

  get sections(): HomeRuleSection[] {
    return this.content.visibleHomeRuleSections(this.readerView.view());
  }

  back(): void {
    void this.routes.navigateTabs('home');
  }
}
