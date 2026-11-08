/**
 * Keeps the latest engine RPM and speed over ground from the shared Signal K stream.
 * Started from the app root so the first full update is not missed.
 */
import { Injectable, OnDestroy } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { emptyFuelMotion, enginesInOrder, FuelMotionState, ingestFuelMotion } from '../fuel/fuel-motion';
import { SignalKDelta, SignalKService } from './signal-k.service';

@Injectable({ providedIn: 'root' })
export class FuelMotionService implements OnDestroy {
  private readonly stateSubject = new BehaviorSubject<FuelMotionState>(emptyFuelMotion());
  readonly state$ = this.stateSubject.asObservable();

  private readonly state = emptyFuelMotion();
  private readonly sub: Subscription;

  constructor(private readonly sk: SignalKService) {
    this.sub = this.sk.delta$.subscribe((delta) => this.onDelta(delta));
  }

  get current(): FuelMotionState {
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
        if (ingestFuelMotion(this.state, reading.path, reading.value)) changed = true;
      }
    }
    if (!changed) return;
    this.stateSubject.next({
      engines: enginesInOrder(this.state.engines).map((engine) => ({ ...engine })),
      sogKn: this.state.sogKn,
    });
  }
}
