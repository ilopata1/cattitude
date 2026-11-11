import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  InspectionDay,
  InspectionProgress,
  dayHasContent,
  emptyDay,
  inspectionProgress,
  mergeInspectionDays,
  sanitizeDay,
} from '../inspection/inspection';
import { walkItemIds } from '../inspection/walk-around';
import { todayKey as wallToday } from '../wall-time';
import { VesselContextService } from './vessel-context.service';

interface InspectionResponse {
  days?: InspectionDay[];
}

const SYNC_NOTE = "Saved on this phone. The boat's copy could not be updated.";

@Injectable({ providedIn: 'root' })
export class InspectionService {
  private readonly http = inject(HttpClient);
  private readonly vessel = inject(VesselContextService);

  readonly days = signal<InspectionDay[]>([]);
  readonly syncNote = signal<string | null>(null);

  private slug = '';
  private dirty = new Set<string>();
  private localEdits = 0;
  private pushing = false;
  private pushAgain = false;
  private timer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.open();
  }

  /** Reload when the vessel in the address changes. */
  open(): void {
    const slug = this.vessel.vesselSlug;
    if (!slug || slug === this.slug) {
      return;
    }
    this.slug = slug;
    this.restore();
    void this.hydrate();
  }

  todayKey(): string {
    return wallToday();
  }

  day(date: string): InspectionDay {
    return this.days().find((item) => item.date === date) ?? emptyDay(date);
  }

  progress(date: string): InspectionProgress {
    return inspectionProgress(this.day(date), walkItemIds());
  }

  /** Earlier days that have a tick or a note, newest first. */
  history(): InspectionDay[] {
    const today = wallToday();
    return this.days()
      .filter((day) => day.date < today && dayHasContent(day))
      .sort((a, b) => b.date.localeCompare(a.date));
  }

  isDone(date: string, itemId: string): boolean {
    return this.day(date).marks[itemId]?.done === true;
  }

  note(date: string, itemId: string): string {
    return this.day(date).marks[itemId]?.note ?? '';
  }

  toggle(date: string, itemId: string): void {
    const current = this.day(date);
    const mark = current.marks[itemId] ?? { done: false, note: '' };
    const marks = { ...current.marks, [itemId]: { done: !mark.done, note: mark.note } };
    if (!marks[itemId].done && !marks[itemId].note) {
      delete marks[itemId];
    }
    this.write(date, marks);
  }

  setNote(date: string, itemId: string, note: string): void {
    const clipped = note.slice(0, 500);
    const current = this.day(date);
    const mark = current.marks[itemId] ?? { done: false, note: '' };
    if (mark.note === clipped) {
      return;
    }
    const marks = { ...current.marks, [itemId]: { done: mark.done, note: clipped } };
    if (!marks[itemId].done && !clipped) {
      delete marks[itemId];
    }
    this.write(date, marks);
  }

  /** Wipe one day and return what it held, so the page can offer undo. */
  clear(date: string): InspectionDay {
    const previous = this.day(date);
    this.write(date, {}, true);
    return previous;
  }

  restoreDay(day: InspectionDay): void {
    this.write(day.date, day.marks, true);
  }

  private write(date: string, marks: InspectionDay['marks'], force = false): void {
    const current = this.day(date);
    if (!force && JSON.stringify(current.marks) === JSON.stringify(marks)) {
      return;
    }
    this.localEdits += 1;
    const next: InspectionDay = { date, marks, updatedAt: new Date().toISOString() };
    const days = this.days().filter((item) => item.date !== date);
    days.push(next);
    days.sort((a, b) => a.date.localeCompare(b.date));
    this.days.set(days.slice(-400));
    this.dirty.add(date);
    this.persist();
    this.schedule();
  }

  private async hydrate(): Promise<void> {
    const slug = this.slug;
    const seen = this.localEdits;
    try {
      const remote = await firstValueFrom(this.http.get<InspectionResponse>(this.url()));
      if (slug !== this.slug) {
        return;
      }
      if (this.localEdits !== seen) {
        await this.push();
        return;
      }
      this.days.set(mergeInspectionDays(this.days(), remote.days ?? [], this.dirty));
      this.persist();
      this.syncNote.set(null);
      if (this.dirty.size) {
        await this.push();
      }
    } catch {
      if (this.dirty.size) {
        this.syncNote.set(SYNC_NOTE);
      }
    }
  }

  private schedule(): void {
    if (this.timer) {
      clearTimeout(this.timer);
    }
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, 4000);
  }

  private async push(): Promise<void> {
    if (!this.dirty.size || !this.slug) {
      return;
    }
    if (this.pushing) {
      this.pushAgain = true;
      return;
    }
    this.pushing = true;
    const generation = this.localEdits;
    const dates = [...this.dirty].slice(0, 60);
    const days = dates
      .map((date) => sanitizeDay(this.day(date)) ?? emptyDay(date, new Date().toISOString()))
      .map((day) => ({ ...day, updatedAt: day.updatedAt || new Date().toISOString() }));
    try {
      await firstValueFrom(this.http.post(this.url(), { days }));
      if (this.localEdits === generation) {
        for (const date of dates) {
          this.dirty.delete(date);
        }
      }
      this.syncNote.set(null);
      this.persist();
    } catch {
      this.syncNote.set(SYNC_NOTE);
    } finally {
      this.pushing = false;
      if (this.pushAgain || (this.dirty.size && this.localEdits !== generation)) {
        this.pushAgain = false;
        this.schedule();
      }
    }
  }

  private restore(): void {
    this.dirty = new Set();
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) {
        this.days.set([]);
        return;
      }
      const parsed = JSON.parse(raw) as { days?: unknown; dirtyDates?: unknown };
      const days: InspectionDay[] = [];
      if (Array.isArray(parsed.days)) {
        for (const item of parsed.days) {
          const day = sanitizeDay(item);
          if (day) {
            days.push(day);
          }
        }
      }
      this.days.set(days);
      if (Array.isArray(parsed.dirtyDates)) {
        for (const date of parsed.dirtyDates) {
          if (typeof date === 'string') {
            this.dirty.add(date);
          }
        }
      }
    } catch {
      this.days.set([]);
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify({
        days: this.days(),
        dirtyDates: [...this.dirty],
      }));
    } catch {
      /* The list stays on screen for this visit. */
    }
  }

  private storageKey(): string {
    return `cattitude.inspection.v1:${this.slug}`;
  }

  private url(): string {
    return `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(this.slug)}/inspections`;
  }
}
