import { Component } from '@angular/core';
import { addIcons } from 'ionicons';
import { MoreRow, moreMenu } from '../../core/guide/more-menu';
import { ContentService } from '../../core/services/content.service';
import { VesselRouteService } from '../../core/services/vessel-route.service';

/** Ionicons has no anchor glyph — used on the Anchorage row. */
const ANCHOR_OUTLINE = `data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' class='ionicon' viewBox='0 0 512 512'><circle cx='256' cy='128' r='48' fill='none' stroke='black' stroke-width='32'/><path d='M256 176v192M128 288h256' fill='none' stroke='black' stroke-width='32' stroke-linecap='round'/><path d='M128 288c0 70.7 57.3 128 128 128s128-57.3 128-128' fill='none' stroke='black' stroke-width='32' stroke-linecap='round'/></svg>`;

addIcons({ 'anchor-outline': ANCHOR_OUTLINE });

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
