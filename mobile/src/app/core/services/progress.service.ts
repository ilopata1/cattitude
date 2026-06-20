import { Injectable } from '@angular/core';
import { Checklist } from '../models/bootstrap-content.model';
import { SYSTEM_ORDER } from '../config/vessel-ui.config';

const PREFIX = 'cattitude-progress';

export interface ChecklistProgress {
  done: number;
  total: number;
  percent: number;
}

@Injectable({ providedIn: 'root' })
export class ProgressService {
  getChecklistState(key: string): Record<string, boolean> {
    return this.readJson(`${PREFIX}-cl-${key}`, {});
  }

  saveChecklistState(key: string, state: Record<string, boolean>): void {
    this.writeJson(`${PREFIX}-cl-${key}`, state);
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
    return this.readJson(`${PREFIX}-learn`, {});
  }

  saveLearnDone(state: Record<string, boolean>): void {
    this.writeJson(`${PREFIX}-learn`, state);
  }

  toggleLearnDone(systemId: string): void {
    const state = this.getLearnDone();
    state[systemId] = !state[systemId];
    this.saveLearnDone(state);
  }

  learnProgress(): ChecklistProgress {
    const state = this.getLearnDone();
    const total = SYSTEM_ORDER.length;
    const done = SYSTEM_ORDER.filter((id) => state[id]).length;
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

  isLearnDone(systemId: string): boolean {
    return !!this.getLearnDone()[systemId];
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
