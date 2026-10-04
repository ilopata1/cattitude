import { Component, Input, inject } from '@angular/core';
import { Router } from '@angular/router';
import { HomeRule, HomeRuleSection } from '../../core/models/bootstrap-content.model';
import { ContentService } from '../../core/services/content.service';
import { ReaderViewService } from '../../core/services/reader-view.service';

@Component({
  selector: 'app-boat-rules',
  templateUrl: './boat-rules.component.html',
  styleUrls: ['./boat-rules.component.scss'],
  standalone: false,
})
export class BoatRulesComponent {
  private readonly content = inject(ContentService);
  private readonly readerView = inject(ReaderViewService);
  private readonly router = inject(Router);
  private boundSections: HomeRuleSection[] | null = null;

  /** When a parent passes sections, they already come from visibleHomeRuleSections. */
  @Input()
  set sections(value: HomeRuleSection[] | null) {
    this.boundSections = value;
  }

  get sections(): HomeRuleSection[] {
    return this.boundSections ?? this.content.visibleHomeRuleSections(this.readerView.view());
  }

  open(rule: HomeRule): void {
    if (rule.link) {
      void this.router.navigateByUrl(rule.link);
    }
  }
}
