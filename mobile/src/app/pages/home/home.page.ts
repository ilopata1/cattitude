import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { HOME_RULE_SECTIONS } from '../../core/config/vessel-ui.config';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.page.html',
  styleUrls: ['./home.page.scss'],
  standalone: false,
})
export class HomePage {
  readonly ruleSections = HOME_RULE_SECTIONS;

  constructor(
    public readonly content: ContentService,
    private readonly router: Router,
  ) {}

  openRuleLink(link: string | undefined): void {
    if (link) {
      void this.router.navigateByUrl(link);
    }
  }
}
