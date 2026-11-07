/**
 * Keeps the latest tank and battery readings from the shared Signal K stream.
 * Started from the app root so the first full update is not missed.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { emptyLevels, ingestLevel, ingestLevelMeta, LevelsState } from '../levels/levels';
import { SignalKDelta, SignalKService } from './signal-k.service';

@Injectable({ providedIn: 'root' })
export class LevelsService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<LevelsState>(emptyLevels());
  readonly state$ = this.stateSubject.asObservable();

  private readonly state = emptyLevels();
  private readonly sub: Subscription;

  constructor(private readonly sk: SignalKService) {
    this.sub = this.sk.delta$.subscribe((delta) => this.onDelta(delta));
  }

  get current(): LevelsState {
    return this.stateSubject.value;
  }

  ngOnDestroy(): void {
    this.sub.unsubscribe();
  }

  private onDelta(delta: SignalKDelta): void {
    const context = delta.context ?? '';
    if (context.startsWith('vessels.') && this.sk.self && context !== this.sk.self) return;

    let changed = false;
    for (const update of delta.updates ?? []) {
      for (const reading of update.values ?? []) {
        if (ingestLevel(this.state, reading.path, reading.value)) changed = true;
      }
      for (const meta of update.meta ?? []) {
        if (ingestLevelMeta(this.state, meta.path, meta.value)) changed = true;
      }
    }
    if (!changed) return;
    this.stateSubject.next({
      tanks: this.state.tanks.map((tank) => ({ ...tank })),
      batteries: this.state.batteries.map((battery) => ({ ...battery })),
    });
  }
}
