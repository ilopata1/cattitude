/** Same stage rules as backend/guide_navigation.py build_learn_path. */

export type LearnLessonKind = 'chapter' | 'power' | 'checklist';

export interface LearnLesson {
  id: string;
  kind: LearnLessonKind;
}

export interface LearnStage {
  id: string;
  title: string;
  lessons: LearnLesson[];
}

const POWER_PART_IDS = ['electrical', 'controls', 'batteries'];

const STAGE_SPECS: Array<{ id: string; title: string; lessons: string[] }> = [
  { id: 'walk', title: 'Walk-around', lessons: ['overview'] },
  { id: 'safety', title: 'Safety briefing', lessons: ['safety-brief'] },
  { id: 'living', title: 'Living aboard', lessons: ['heads', 'water', 'power', 'galley', 'ac'] },
  { id: 'underway', title: 'Underway', lessons: ['engines', 'sails', 'nav', 'anchoring'] },
  { id: 'ashore', title: 'Going ashore', lessons: ['dinghy'] },
];

export function buildLearnPath(systemIds: string[], checklistIds: string[]): LearnStage[] {
  const present = new Set(systemIds);
  const checks = new Set(checklistIds);
  const hasPower = POWER_PART_IDS.some((id) => present.has(id));
  const stages: LearnStage[] = [];
  for (const spec of STAGE_SPECS) {
    const lessons: LearnLesson[] = [];
    for (const lessonId of spec.lessons) {
      if (lessonId === 'safety-brief') {
        if (checks.has(lessonId)) {
          lessons.push({ id: lessonId, kind: 'checklist' });
        }
        continue;
      }
      if (lessonId === 'power') {
        if (hasPower) {
          lessons.push({ id: 'power', kind: 'power' });
        }
        continue;
      }
      if (present.has(lessonId)) {
        lessons.push({ id: lessonId, kind: 'chapter' });
      }
    }
    if (lessons.length) {
      stages.push({ id: spec.id, title: spec.title, lessons });
    }
  }
  return stages;
}

export function resolveLearnPath(
  learnPath: LearnStage[] | undefined,
  systemIds: string[],
  checklistIds: string[],
): LearnStage[] {
  if (learnPath && learnPath.length) {
    return learnPath;
  }
  return buildLearnPath(systemIds, checklistIds);
}
