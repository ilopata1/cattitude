import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { LearnStage, resolveLearnPath } from '../../core/guide/learn-path';
import { DoMenuItem } from '../../core/models/bootstrap-content.model';
import { ContentService } from '../../core/services/content.service';
import { ProgressService } from '../../core/services/progress.service';
import { stageTicks, tickLabel } from './learn/learn-ticks';

@Component({
  selector: 'app-do',
  templateUrl: './do.page.html',
  styleUrls: ['./do.page.scss'],
  standalone: false,
})
export class DoPage {
  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly router: Router,
  ) {}

  get learnCard(): DoMenuItem | null {
    for (const section of this.content.bootstrap.ui.doMenu) {
      const item = section.items.find((entry) => entry.progressType === 'learn');
      if (item) {
        return item;
      }
    }
    if (!this.learnStages.length) {
      return null;
    }
    return {
      key: 'learn',
      title: 'Learn the boat',
      subtitle: 'Work through the boat one stage at a time',
      icon: 'school-outline',
      iconClass: 'ic-navy',
      route: '/tabs/do/learn',
      progressType: 'learn',
    };
  }

  get learnStages(): Array<LearnStage & { progress: string }> {
    const ui = this.content.bootstrap.ui;
    return resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    ).map((stage) => ({
      ...stage,
      progress: tickLabel(stageTicks(this.content, this.progress, stage)),
    }));
  }

  get menu() {
    return this.content.bootstrap.ui.doMenu
      .map((section) => ({
        ...section,
        items: section.items.filter((item) => item.progressType !== 'learn'),
      }))
      .filter((section) => section.items.length > 0);
  }

  progressLabel(itemKey: string, progressType: 'checklist' | 'learn'): string {
    if (progressType === 'learn') {
      return this.progress.learnProgressLabel();
    }
    return this.progress.checklistProgressLabel(
      this.progress.checklistProgress(
        itemKey,
        this.content.getChecklist(itemKey),
      ),
    );
  }

  open(route: string): void {
    void this.router.navigateByUrl(route);
  }
}
