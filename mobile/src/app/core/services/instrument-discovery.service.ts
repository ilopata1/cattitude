/**
 * Collects Signal-K paths seen on the delta stream for instrument mapping.
 */
import { Injectable } from '@angular/core';
import { Observable, Subscription } from 'rxjs';
import { SignalKDelta, SignalKService } from './signal-k.service';

export interface DiscoveredPath {
  /** Full path including self prefix, e.g. self.environment.depth.belowTransducer */
  path: string;
  value: number;
  seenAt: number;
}

const SCAN_MS = 45_000;

@Injectable({ providedIn: 'root' })
export class InstrumentDiscoveryService {

  private readonly byPath = new Map<string, DiscoveredPath>();

  constructor(private readonly sk: SignalKService) {}

  /** Subscribe to deltas for `durationMs`, merging numeric paths for the own vessel. */
  scan(durationMs = SCAN_MS): Observable<Map<string, DiscoveredPath>> {
    return new Observable(subscriber => {
      this.byPath.clear();
      const selfPrefix = this.sk.self ? `${this.sk.self}.` : 'self.';

      const handle = (delta: SignalKDelta): void => {
        const now = Date.now();
        for (const update of delta.updates ?? []) {
          for (const kv of update.values ?? []) {
            if (!kv.path.startsWith(selfPrefix)) continue;
            const value = kv.value;
            if (typeof value !== 'number' || !Number.isFinite(value)) continue;
            this.byPath.set(kv.path, { path: kv.path, value, seenAt: now });
          }
        }
        subscriber.next(new Map(this.byPath));
      };

      const sub: Subscription = this.sk.delta$.subscribe(handle);
      const timer = setTimeout(() => {
        sub.unsubscribe();
        subscriber.next(new Map(this.byPath));
        subscriber.complete();
      }, durationMs);

      return () => {
        clearTimeout(timer);
        sub.unsubscribe();
      };
    });
  }

  snapshot(): Map<string, DiscoveredPath> {
    return new Map(this.byPath);
  }
}
