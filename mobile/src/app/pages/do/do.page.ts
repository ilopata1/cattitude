import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { ContentService } from '../../core/services/content.service';
import { ProgressService } from '../../core/services/progress.service';

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

  get menu() {
    return this.content.bootstrap.ui.doMenu;
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
