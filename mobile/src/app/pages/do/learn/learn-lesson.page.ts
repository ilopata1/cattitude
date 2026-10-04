import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AlertController, ToastController } from '@ionic/angular';
import { confirmChecklistReset } from '../checklist/checklist-reset';
import { LearnLesson, LearnStage, resolveLearnPath } from '../../../core/guide/learn-path';
import { isPowerPart, POWER_TOPIC_ID, powerSubtitle } from '../../../core/guide/power-topic';
import { knowChapterRoute } from '../../../core/guide/dashboard';
import { Checklist, SystemModule } from '../../../core/models/bootstrap-content.model';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { ReaderViewService } from '../../../core/services/reader-view.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';

@Component({
  selector: 'app-learn-lesson',
  templateUrl: './learn-lesson.page.html',
  styleUrls: ['./learn.page.scss', '../checklist/checklist.page.scss'],
  standalone: false,
})
export class LearnLessonPage implements OnInit {
  stage: LearnStage | null = null;
  lesson: LearnLesson | null = null;
  system: SystemModule | null = null;
  checklist: Checklist | undefined;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    public readonly readerView: ReaderViewService,
    private readonly route: ActivatedRoute,
    private readonly vesselRoutes: VesselRouteService,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  reset(): void {
    if (this.lesson?.kind === 'checklist') {
      void confirmChecklistReset(this.alerts, this.toasts, this.progress, this.lesson.id);
    }
  }

  private load(): void {
    const stageId = this.route.snapshot.paramMap.get('stageId') ?? '';
    const lessonId = this.route.snapshot.paramMap.get('lessonId') ?? '';
    const ui = this.content.bootstrap.ui;
    const stages = resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    );
    this.stage = stages.find((stage) => stage.id === stageId) ?? null;
    this.lesson = this.stage?.lessons.find((lesson) => lesson.id === lessonId) ?? null;
    this.system =
      this.lesson?.kind === 'chapter' ? this.content.getSystem(this.lesson.id) ?? null : null;
    this.checklist =
      this.lesson?.kind === 'checklist' ? this.content.getChecklist(this.lesson.id) : undefined;
  }

  get title(): string {
    if (!this.lesson) {
      return 'Learn the boat';
    }
    if (this.lesson.kind === 'power') {
      return 'Power';
    }
    if (this.lesson.kind === 'checklist') {
      return this.content.bootstrap.ui.checklistMeta[this.lesson.id]?.title || 'Safety briefing';
    }
    return this.system?.title || this.lesson.id;
  }

  get subtitle(): string {
    if (this.lesson?.kind === 'checklist') {
      return this.content.bootstrap.ui.checklistMeta[this.lesson.id]?.subtitle || '';
    }
    if (this.lesson?.kind === 'power') {
      return powerSubtitle(this.content.getSystemsOrdered().filter((system) => isPowerPart(system.id)));
    }
    return this.system?.subtitle || '';
  }

  get progressState() {
    if (!this.lesson || this.lesson.kind !== 'checklist') {
      return { done: 0, total: 0, percent: 0 };
    }
    return this.progress.checklistProgress(this.lesson.id, this.checklist, this.readerView.view());
  }

  isDone(groupIndex: number, itemIndex: number): boolean {
    return !!this.lesson && this.progress.isChecklistItemDone(this.lesson.id, groupIndex, itemIndex);
  }

  toggle(groupIndex: number, itemIndex: number): void {
    if (this.lesson) {
      this.progress.toggleChecklistItem(this.lesson.id, groupIndex, itemIndex);
    }
  }

  openLinkedSystem(id: string): void {
    const targetId = isPowerPart(id) || id === POWER_TOPIC_ID ? 'power' : id;
    const ui = this.content.bootstrap.ui;
    const stages = resolveLearnPath(
      ui.learnPath,
      ui.systemOrder,
      Object.keys(this.content.bootstrap.checklists),
    );
    for (const stage of stages) {
      const lesson = stage.lessons.find((item) => item.id === targetId);
      if (lesson && lesson.kind !== 'checklist') {
        void this.vesselRoutes.navigateTabs('do', 'learn', stage.id, lesson.id);
        return;
      }
    }
    const route = knowChapterRoute(targetId);
    void this.vesselRoutes.navigateTabsWithExtras(route.segments, { queryParams: route.query });
  }

  back(): void {
    if (this.stage) {
      void this.vesselRoutes.navigateTabs('do', 'learn', this.stage.id);
      return;
    }
    void this.vesselRoutes.navigateTabs('do', 'learn');
  }
}
