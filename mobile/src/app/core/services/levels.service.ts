/**
 * Keeps the latest tank and battery readings from the shared Signal K stream.
 * Started from the app root so the first full update is not missed.
 *
 * Display names saved in the server are metadata. A connected app hears the
 * change at once, but the next connection only replays sensor values. The
 * names are read back from the REST tree each time the socket connects.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { emptyLevels, ingestLevel, ingestLevelDocument, ingestLevelMeta, LevelsState } from '../levels/levels';
import { SignalKDelta, SignalKService } from './signal-k.service';
import { SignalKSettingsService } from './signal-k-settings.service';

@Injectable({ providedIn: 'root' })
export class LevelsService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<LevelsState>(emptyLevels());
  readonly state$ = this.stateSubject.asObservable();

  private readonly state = emptyLevels();
  private readonly sub: Subscription;
  private readonly connectionSub: Subscription;
  private hydrateToken = 0;

  constructor(
    private readonly sk: SignalKService,
    private readonly settings: SignalKSettingsService,
  ) {
    this.sub = this.sk.delta$.subscribe((delta) => this.onDelta(delta));
    this.connectionSub = this.sk.state$.subscribe((state) => {
      if (state === 'connected') void this.hydrateNames();
    });
  }

  get current(): LevelsState {
    return this.stateSubject.value;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
    this.connectionSub.unsubscribe();
  }

  private onDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;

    let changed = false;
    for (const update of delta.updates ?? []) {
      for (const reading of update.values ?? []) {
        if (ingestLevel(this.state, reading.path, reading.value)) changed = true;
        if (reading.meta != null && ingestLevelMeta(this.state, reading.path, reading.meta)) changed = true;
      }
      for (const meta of update.meta ?? []) {
        if (ingestLevelMeta(this.state, meta.path, meta.value)) changed = true;
      }
    }
    if (!changed) return;
    this.publish();
  }

  private async hydrateNames(): Promise<void> {
    const token = ++this.hydrateToken;
    const base = this.sk.httpBaseUrl();
    if (!base) return;
    const [tanks, batteries] = await Promise.all([
      this.readJson(`${base}/signalk/v1/api/vessels/self/tanks`),
      this.readJson(`${base}/signalk/v1/api/vessels/self/electrical/batteries`),
    ]);
    if (token !== this.hydrateToken) return;
    const document: { tanks?: unknown; electrical?: { batteries?: unknown } } = {};
    if (tanks !== undefined) document.tanks = tanks;
    if (batteries !== undefined) document.electrical = { batteries };
    if (!ingestLevelDocument(this.state, document)) return;
    this.publish();
  }

  private async readJson(url: string): Promise<unknown> {
    try {
      const headers: Record<string, string> = { Accept: 'application/json' };
      const token = this.settings.token.trim();
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch(url, { cache: 'no-store', headers });
      if (!res.ok) return undefined;
      return await res.json();
    } catch {
      return undefined;
    }
  }

  private publish(): void {
    this.stateSubject.next({
      tanks: this.state.tanks.map((tank) => ({ ...tank })),
      batteries: this.state.batteries.map((battery) => ({ ...battery })),
    });
  }
}
