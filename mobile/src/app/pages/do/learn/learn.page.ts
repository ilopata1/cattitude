import { Component } from '@angular/core';
import { LearnStage, resolveLearnPath } from '../../../core/guide/learn-path';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { ReaderViewService } from '../../../core/services/reader-view.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';
import { stageTicks, tickLabel } from './learn-ticks';

@Component({
  selector: 'app-learn',
  templateUrl: './learn.page.html',
  styleUrls: ['./learn.page.scss'],
  standalone: false,
})
export class LearnPage {
  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly readerView: ReaderViewService,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  get stages(): LearnStage[] {
    const ui = this.content.bootstrap.ui;
    return resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    );
  }

  label(stage: LearnStage): string {
    return tickLabel(stageTicks(this.content, this.progress, stage, this.readerView.view()));
  }

  open(stage: LearnStage): void {
    void this.vesselRoutes.navigateTabs('do', 'learn', stage.id);
  }

  trackStage(_: number, stage: LearnStage): string {
    return stage.id;
  }
}
