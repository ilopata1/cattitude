import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  CrewMember,
  DutyRota,
  assigneeAt,
  defaultDutyRota,
  namedCrew,
  newDutyId,
  preferRota,
  sanitizeRota,
} from '../duty/duty-rota';
import { wallNowMs } from '../wall-time';
import { VesselContextService } from './vessel-context.service';

interface DutyResponse {
  rota?: DutyRota | null;
}

const SYNC_NOTE = "Saved on this phone. The boat's copy could not be updated.";

@Injectable({ providedIn: 'root' })
export class DutyRotaService {
  private readonly http = inject(HttpClient);
  private readonly vessel = inject(VesselContextService);

  readonly rota = signal<DutyRota>(defaultDutyRota());
  readonly syncNote = signal<string | null>(null);

  private slug = '';
  private dirty = false;
  private localEdits = 0;
  private pushing = false;
  private pushAgain = false;
  private timer: ReturnType<typeof setTimeout> | null = null;
  private ready: Promise<void> = Promise.resolve();

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
    this.ready = this.hydrate().then(() => undefined, () => undefined);
  }

  /** Resolves after the latest local restore and server load for this vessel. */
  whenReady(): Promise<void> {
    return this.ready;
  }

  hasVessel(): boolean {
    return this.slug.length > 0;
  }

  named(): CrewMember[] {
    return namedCrew(this.rota());
  }

  assigneeName(taskId: string, atMs = wallNowMs()): string | null {
    return assigneeAt(this.rota(), taskId, atMs);
  }

  setStart(value: string): void {
    this.mutate((rota) => ({ ...rota, startAt: value }));
  }

  addCrew(): void {
    this.mutate((rota) => ({
      ...rota,
      crew: [...rota.crew, { id: newDutyId(), name: '' }],
    }));
  }

  renameCrew(id: string, name: string): void {
    this.mutate((rota) => ({
      ...rota,
      crew: rota.crew.map((person) => person.id === id ? { ...person, name: name.slice(0, 60) } : person),
    }));
  }

  removeCrew(id: string): void {
    this.mutate((rota) => ({
      ...rota,
      crew: rota.crew.filter((person) => person.id !== id),
      tasks: rota.tasks.map((task) => ({
        ...task,
        sequence: task.sequence.filter((crewId) => crewId !== id),
      })),
    }));
  }

  addTask(): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: [...rota.tasks, {
        id: newDutyId(),
        name: '',
        intervalHours: 24,
        sequence: namedCrew(rota).map((person) => person.id),
      }],
    }));
  }

  renameTask(id: string, name: string): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: rota.tasks.map((task) => task.id === id ? { ...task, name: name.slice(0, 40) } : task),
    }));
  }

  setInterval(id: string, hours: number): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: rota.tasks.map((task) => task.id === id ? { ...task, intervalHours: hours } : task),
    }));
  }

  removeTask(id: string): void {
    this.mutate((rota) => ({ ...rota, tasks: rota.tasks.filter((task) => task.id !== id) }));
  }

  addToSequence(taskId: string, crewId: string): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: rota.tasks.map((task) => {
        if (task.id !== taskId || task.sequence.length >= 64 || !rota.crew.some((person) => person.id === crewId)) {
          return task;
        }
        return { ...task, sequence: [...task.sequence, crewId] };
      }),
    }));
  }

  moveInSequence(taskId: string, index: number, delta: number): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: rota.tasks.map((task) => {
        if (task.id !== taskId) {
          return task;
        }
        const target = index + delta;
        if (target < 0 || target >= task.sequence.length) {
          return task;
        }
        const sequence = task.sequence.slice();
        const [row] = sequence.splice(index, 1);
        sequence.splice(target, 0, row);
        return { ...task, sequence };
      }),
    }));
  }

  removeFromSequence(taskId: string, index: number): void {
    this.mutate((rota) => ({
      ...rota,
      tasks: rota.tasks.map((task) => task.id === taskId
        ? { ...task, sequence: task.sequence.filter((_, at) => at !== index) }
        : task),
    }));
  }

  private mutate(update: (rota: DutyRota) => DutyRota): void {
    const next = update(this.rota());
    if (sameRota(next, this.rota())) {
      return;
    }
    this.localEdits += 1;
    this.dirty = true;
    this.rota.set({ ...next, updatedAt: new Date().toISOString() });
    this.persist();
    this.schedule();
  }

  private async hydrate(): Promise<void> {
    const slug = this.slug;
    const seen = this.localEdits;
    try {
      const remote = await firstValueFrom(this.http.get<DutyResponse>(this.url()));
      if (slug !== this.slug) {
        return;
      }
      if (this.localEdits !== seen) {
        await this.push();
        return;
      }
      const incoming = remote.rota ? sanitizeRota(remote.rota) : null;
      const chosen = preferRota(this.rota(), incoming, this.dirty);
      this.rota.set(chosen);
      this.persist();
      this.syncNote.set(null);
      if (this.dirty || (chosen.updatedAt && !incoming)) {
        await this.push();
      }
    } catch {
      if (this.dirty) {
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
    if (!this.dirty || !this.slug) {
      return;
    }
    if (this.pushing) {
      this.pushAgain = true;
      return;
    }
    this.pushing = true;
    const generation = this.localEdits;
    const rota = sanitizeRota(this.rota());
    try {
      const saved = await firstValueFrom(this.http.post<DutyResponse>(this.url(), { rota }));
      if (this.slug && this.localEdits === generation && saved.rota) {
        this.rota.set(sanitizeRota(saved.rota));
        this.dirty = false;
      }
      this.syncNote.set(null);
      this.persist();
    } catch {
      this.syncNote.set(SYNC_NOTE);
    } finally {
      this.pushing = false;
      if (this.pushAgain || (this.dirty && this.localEdits !== generation)) {
        this.pushAgain = false;
        this.schedule();
      }
    }
  }

  private restore(): void {
    this.dirty = false;
    this.timer && clearTimeout(this.timer);
    this.timer = null;
    try {
      const raw = localStorage.getItem(this.storageKey());
      if (!raw) {
        this.rota.set(defaultDutyRota());
        return;
      }
      const parsed = JSON.parse(raw) as { rota?: unknown; dirty?: boolean };
      this.rota.set(sanitizeRota(parsed.rota));
      this.dirty = parsed.dirty === true;
    } catch {
      this.rota.set(defaultDutyRota());
    }
  }

  private persist(): void {
    try {
      localStorage.setItem(this.storageKey(), JSON.stringify({ rota: this.rota(), dirty: this.dirty }));
    } catch {
      /* The phone can still show the rota for this visit. */
    }
  }

  private storageKey(): string {
    return `cattitude.dutyRota.v1:${this.slug}`;
  }

  private url(): string {
    return `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(this.slug)}/duty-rota`;
  }
}

function sameRota(a: DutyRota, b: DutyRota): boolean {
  return JSON.stringify(stripUpdated(a)) === JSON.stringify(stripUpdated(b));
}

function stripUpdated(rota: DutyRota): Omit<DutyRota, 'updatedAt'> {
  const { updatedAt, ...rest } = rota;
  void updatedAt;
  return rest;
}
