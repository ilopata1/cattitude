import { Injectable } from '@angular/core';
import { Checklist, LearnCheck, SystemModule } from '../models/bootstrap-content.model';
import { ContentService } from './content.service';
import { VesselContextService } from './vessel-context.service';

export interface ChecklistProgress {
  done: number;
  total: number;
  percent: number;
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  constructor(
    private readonly content: ContentService,
    private readonly vesselContext: VesselContextService,
  ) {}

  private get prefix(): string {
    return `${this.vesselContext.vesselSlug}-progress`;
  }

  getChecklistState(key: string): Record<string, boolean> {
    return this.readJson(`${this.prefix}-cl-${key}`, {});
  }

  saveChecklistState(key: string, state: Record<string, boolean>): void {
    this.writeJson(`${this.prefix}-cl-${key}`, state);
  }

  toggleChecklistItem(key: string, groupIndex: number, itemIndex: number): void {
    const state = this.getChecklistState(key);
    const id = `${groupIndex}-${itemIndex}`;
    state[id] = !state[id];
    this.saveChecklistState(key, state);
  }

  resetChecklist(key: string): void {
    this.saveChecklistState(key, {});
  }

  checklistProgress(key: string, checklist: Checklist | undefined): ChecklistProgress {
    if (!checklist) {
      return { done: 0, total: 0, percent: 0 };
    }
    const state = this.getChecklistState(key);
    let total = 0;
    let done = 0;
    checklist.groups.forEach((group, gi) =>
      group.items.forEach((_, ii) => {
        total += 1;
        if (state[`${gi}-${ii}`]) {
          done += 1;
        }
      }),
    );
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  }

  checklistProgressLabel(progress: ChecklistProgress): string {
    if (progress.total === 0 || progress.done === 0) {
      return '';
    }
    if (progress.done === progress.total) {
      return '✅ Complete';
    }
    return `${progress.done} of ${progress.total} checked`;
  }

  isChecklistItemDone(key: string, groupIndex: number, itemIndex: number): boolean {
    return !!this.getChecklistState(key)[`${groupIndex}-${itemIndex}`];
  }

  getLearnDone(): Record<string, boolean> {
    return this.readJson(`${this.prefix}-learn-checks`, {});
  }

  saveLearnDone(state: Record<string, boolean>): void {
    this.writeJson(`${this.prefix}-learn-checks`, state);
  }

  toggleCheck(system: SystemModule, check: string | LearnCheck): void {
    const state = this.getLearnDone();
    const key = learnCheckStorageKey(system.id, check);
    state[key] = !state[key];
    this.saveLearnDone(state);
  }

  isCheckDone(system: SystemModule, check: string | LearnCheck): boolean {
    return !!this.getLearnDone()[learnCheckStorageKey(system.id, check)];
  }

  toggleSystem(system: SystemModule): void {
    const state = this.getLearnDone();
    const checks = system.learnChecks ?? [];
    if (!checks.length) {
      state[system.id] = !state[system.id];
      this.saveLearnDone(state);
      return;
    }
    const keys = checks.map((check) => learnCheckStorageKey(system.id, check));
    const allDone = keys.every((key) => state[key]);
    for (const key of keys) {
      if (allDone) {
        delete state[key];
      } else {
        state[key] = true;
      }
    }
    this.saveLearnDone(state);
  }

  isSystemDone(system: SystemModule): boolean {
    const state = this.getLearnDone();
    const checks = system.learnChecks ?? [];
    if (!checks.length) {
      return !!state[system.id];
    }
    return checks.every((check) => state[learnCheckStorageKey(system.id, check)]);
  }

  learnProgress(): ChecklistProgress {
    const systems = this.content.getSystemsOrdered();
    const total = systems.length;
    const done = systems.filter((system) => this.isSystemDone(system)).length;
    return {
      done,
      total,
      percent: total ? Math.round((done / total) * 100) : 0,
    };
  }

  learnProgressLabel(): string {
    const { done, total } = this.learnProgress();
    if (done === total) {
      return '✅ All systems reviewed!';
    }
    return `${done} of ${total} topics reviewed`;
  }

  private readJson<T>(key: string, fallback: T): T {
    try {
      const raw = localStorage.getItem(key);
      return raw ? (JSON.parse(raw) as T) : fallback;
    } catch {
      return fallback;
    }
  }

  private writeJson(key: string, value: unknown): void {
    localStorage.setItem(key, JSON.stringify(value));
  }
}

/** Same slug as backend/guide_learn_checks.py slug_text. */
export function learnCheckSlug(text: string): string {
  return text.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '') || 'check';
}

export function learnCheckText(check: string | LearnCheck): string {
  return typeof check === 'string' ? check : check.text;
}

export function learnCheckStorageKey(systemId: string, check: string | LearnCheck): string {
  if (typeof check !== 'string' && check.key) {
    return check.key;
  }
  return `${systemId}/${learnCheckSlug(learnCheckText(check))}`;
}
