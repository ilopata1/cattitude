import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HomeRule, HomeRuleSection } from '../../core/models/bootstrap-content.model';
import { ContentService } from '../../core/services/content.service';

@Component({
  selector: 'app-boat-rules',
  templateUrl: './boat-rules.component.html',
  styleUrls: ['./boat-rules.component.scss'],
  standalone: false,
})
export class BoatRulesComponent {
  private readonly content = inject(ContentService);
  private readonly router = inject(Router);

  get sections(): HomeRuleSection[] {
    return this.content.bootstrap.ui.homeRuleSections ?? [];
  }

  open(rule: HomeRule): void {
    if (rule.link) {
      void this.router.navigateByUrl(rule.link);
    }
  }
}
