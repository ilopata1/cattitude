import { Component } from '@angular/core';
import { MoreRow, moreMenu } from '../../core/guide/more-menu';
import { ContentService } from '../../core/services/content.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

@Component({
  selector: 'app-more',
  templateUrl: './more.page.html',
  styleUrls: ['./more.page.scss'],
  standalone: false,
})
export class MorePage {
  constructor(
    public readonly content: ContentService,
    private readonly routes: VesselRouteService,
  ) {}

  get rows(): MoreRow[] {
    return moreMenu(this.content.bootstrap.branding.vesselType);
  }

  open(row: MoreRow): void {
    void this.routes.navigateTabs('more', ...row.route);
  }
}
