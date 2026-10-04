import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { LearnLesson, LearnStage, resolveLearnPath } from '../../../core/guide/learn-path';
import { isPowerPart, powerSubtitle } from '../../../core/guide/power-topic';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { ReaderViewService } from '../../../core/services/reader-view.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';
import { lessonTicks, tickLabel } from './learn-ticks';

@Component({
  selector: 'app-learn-stage',
  templateUrl: './learn-stage.page.html',
  styleUrls: ['./learn.page.scss'],
  standalone: false,
})
export class LearnStagePage implements OnInit {
  stage: LearnStage | null = null;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly readerView: ReaderViewService,
    private readonly route: ActivatedRoute,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      const stageId = params.get('stageId') ?? '';
      this.stage = this.stages.find((stage) => stage.id === stageId) ?? null;
    });
  }

  get stages(): LearnStage[] {
    const ui = this.content.bootstrap.ui;
    return resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    );
  }

  lessonTitle(lesson: LearnLesson): string {
    if (lesson.kind === 'power') {
      return 'Power';
    }
    if (lesson.kind === 'checklist') {
      return this.content.bootstrap.ui.checklistMeta[lesson.id]?.title || 'Safety briefing';
    }
    return this.content.getSystem(lesson.id)?.title || lesson.id;
  }

  lessonSubtitle(lesson: LearnLesson): string {
    if (lesson.kind === 'power') {
      return powerSubtitle(this.content.getSystemsOrdered().filter((system) => isPowerPart(system.id)));
    }
    if (lesson.kind === 'checklist') {
      return this.content.bootstrap.ui.checklistMeta[lesson.id]?.subtitle || '';
    }
    return this.content.getSystem(lesson.id)?.subtitle || '';
  }

  label(lesson: LearnLesson): string {
    return tickLabel(lessonTicks(this.content, this.progress, lesson, this.readerView.view()));
  }

  open(lesson: LearnLesson): void {
    if (!this.stage) {
      return;
    }
    void this.vesselRoutes.navigateTabs('do', 'learn', this.stage.id, lesson.id);
  }

  back(): void {
    void this.vesselRoutes.navigateTabs('do', 'learn');
  }

  trackLesson(_: number, lesson: LearnLesson): string {
    return lesson.id;
  }
}
