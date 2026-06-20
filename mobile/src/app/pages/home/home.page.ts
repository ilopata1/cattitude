import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../core/services/content.service';

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
  ) {}

  get ruleSections() {
    return this.content.bootstrap.ui.homeRuleSections;
  }

  openRuleLink(link: string | undefined): void {
    if (link) {
      void this.router.navigateByUrl(link);
    }
  }
}
