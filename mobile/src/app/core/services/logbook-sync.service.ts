import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { environment } from '../../../environments/environment';
import { LogEntry, Passage } from '../models/logbook.model';
import { LogbookStoreService } from './logbook-store.service';
import { VesselContextService } from './vessel-context.service';

interface LogbookPayload {
  entries: LogEntry[];
  passage: Passage | null;
}

@Injectable({ providedIn: 'root' })
export class LogbookSyncService {
  private readonly http = inject(HttpClient);
  private readonly store = inject(LogbookStoreService);
  private readonly vessel = inject(VesselContextService);
  private timer: ReturnType<typeof setTimeout> | null = null;
  private pushing = false;
  readonly error = signal<string | null>(null);
  readonly lastSyncedAt = signal<string | null>(null);

  schedule(): void {
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => {
      this.timer = null;
      void this.push();
    }, 4_000);
  }

  async push(): Promise<void> {
    if (!(await this.store.settings()).syncEnabled) return;
    if (this.pushing) return;
    this.pushing = true;
    try {
      const dirty = new Set(await this.store.dirtyIds());
      const passageDirty = await this.store.passageDirty();
      if (!dirty.size && !passageDirty) return;
      const entries = (await this.store.entries()).filter(entry => dirty.has(entry.id));
      const passage = passageDirty ? await this.store.passage() : null;
      await firstValueFrom(this.http.post(this.url(), {
        entries,
        passage: passageDirty ? passage : undefined,
      }));
      await this.store.clearDirty([...dirty]);
      if (passageDirty) await this.store.markPassageDirty(false);
      this.error.set(null);
      this.lastSyncedAt.set(new Date().toISOString());
    } catch {
      this.error.set('Saved on this device. The server did not take the latest entries.');
    } finally {
      this.pushing = false;
    }
  }

  /** Pull entries this device does not have. Local unsynced edits win. */
  async pull(): Promise<{ entries: LogEntry[]; passage: Passage | null }> {
    const localEntries = await this.store.entries();
    const localPassage = await this.store.passage();
    if (!(await this.store.settings()).syncEnabled) {
      return { entries: localEntries, passage: localPassage };
    }
    try {
      const remote = await firstValueFrom(this.http.get<LogbookPayload>(this.url()));
      const dirty = new Set(await this.store.dirtyIds());
      const byId = new Map(localEntries.map(entry => [entry.id, entry]));
      for (const entry of remote.entries ?? []) {
        const have = byId.get(entry.id);
        if (!have) {
          await this.store.saveEntry(entry);
          byId.set(entry.id, entry);
        } else if (!dirty.has(entry.id) && entry.updatedAt > have.updatedAt) {
          await this.store.saveEntry(entry);
          byId.set(entry.id, entry);
        }
      }
      let passage = localPassage;
      const remotePassage = remote.passage ?? null;
      const passageDirty = await this.store.passageDirty();
      if (remotePassage && !passageDirty && (!passage || remotePassage.updatedAt > passage.updatedAt)) {
        await this.store.savePassage(remotePassage);
        passage = remotePassage;
      }
      this.error.set(null);
      this.lastSyncedAt.set(new Date().toISOString());
      const entries = [...byId.values()].sort((a, b) => b.at.localeCompare(a.at));
      return { entries, passage };
    } catch {
      this.error.set('Working from this device. The logbook server could not be reached.');
      return { entries: localEntries, passage: localPassage };
    }
  }

  private url(): string {
    return `${environment.apiUrl}/api/v1/vessels/${encodeURIComponent(this.vessel.vesselSlug)}/logbook`;
  }
}
