import { LearnLesson, LearnStage } from '../../../core/guide/learn-path';
import { isPowerPart } from '../../../core/guide/power-topic';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';

export interface TickCount {
  done: number;
  total: number;
}

export function lessonTicks(
  content: ContentService,
  progress: ProgressService,
  lesson: LearnLesson,
): TickCount {
  if (lesson.kind === 'checklist') {
    const state = progress.checklistProgress(lesson.id, content.getChecklist(lesson.id));
    return { done: state.done, total: state.total };
  }
  const systems =
    lesson.kind === 'power'
      ? content.getSystemsOrdered().filter((system) => isPowerPart(system.id))
      : [content.getSystem(lesson.id)].filter((system) => !!system);
  let done = 0;
  let total = 0;
  for (const system of systems) {
    if (!system) {
      continue;
    }
    const checks = system.learnChecks ?? [];
    if (!checks.length) {
      total += 1;
      if (progress.isSystemDone(system)) {
        done += 1;
      }
      continue;
    }
    for (const check of checks) {
      total += 1;
      if (progress.isCheckDone(system, check)) {
        done += 1;
      }
    }
  }
  return { done, total };
}

export function stageTicks(
  content: ContentService,
  progress: ProgressService,
  stage: LearnStage,
): TickCount {
  return stage.lessons.reduce(
    (sum, lesson) => {
      const ticks = lessonTicks(content, progress, lesson);
      return { done: sum.done + ticks.done, total: sum.total + ticks.total };
    },
    { done: 0, total: 0 },
  );
}

export function tickLabel(ticks: TickCount): string {
  if (!ticks.total) {
    return '';
  }
  if (ticks.done === ticks.total) {
    return 'Complete';
  }
  return `${ticks.done} of ${ticks.total}`;
}
