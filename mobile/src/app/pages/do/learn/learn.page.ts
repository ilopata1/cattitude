import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { Router } from '@angular/router';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { SystemModule } from '../../../core/models/bootstrap-content.model';

@Component({
  selector: 'app-learn',
  templateUrl: './learn.page.html',
  styleUrls: ['./learn.page.scss'],
  standalone: false,
})
export class LearnPage {
  openId: string | null = null;

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly location: Location,
    private readonly router: Router,
  ) {}

  get systems(): SystemModule[] {
    return this.content.getSystemsOrdered();
  }

  get progressState() {
    return this.progress.learnProgress();
  }

  toggleOpen(id: string): void {
    this.openId = this.openId === id ? null : id;
  }

  toggleDone(id: string, event: Event): void {
    event.stopPropagation();
    this.progress.toggleLearnDone(id);
  }

  isDone(id: string): boolean {
    return this.progress.isLearnDone(id);
  }

  openSystemDetail(id: string, event: Event): void {
    event.stopPropagation();
    void this.router.navigate(['/tabs/know'], {
      queryParams: { system: id },
    });
  }

  back(): void {
    this.location.back();
  }
}
