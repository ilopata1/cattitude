import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { AnchorageAlert } from '../models/anchorage.model';
import { Vessel } from '../models/vessel.model';
import { pairwiseSeverityBetweenAnchoredVessels } from '../calculators/anchor.calculator';

@Injectable({ providedIn: 'root' })
export class AnchorageAlertService {
  private readonly alertsSubject = new BehaviorSubject<AnchorageAlert[]>([]);
  readonly alerts$ = this.alertsSubject.asObservable();
  readonly activeAlerts$: Observable<AnchorageAlert[]> = this.alerts$.pipe(
    map(alerts => alerts.filter(a => !a.resolved)),
  );

  /** Pair keys newly introduced as unresolved conflicts since the last evaluate. */
  private readonly newlyRaised: AnchorageAlert[] = [];

  consumeNewlyRaised(): AnchorageAlert[] {
    const out = [...this.newlyRaised];
    this.newlyRaised.length = 0;
    return out;
  }

  evaluateAlerts(vessels: Vessel[]): void {
    const current = [...this.alertsSubject.value];
    const activeConflicts = new Set<string>();
    const tracked = vessels.filter(
      v => v.tracked && v.anchorPoint && v.state !== 'moving' && v.state !== 'unknown',
    );

    for (let i = 0; i < tracked.length; i++) {
      for (let j = i + 1; j < tracked.length; j++) {
        const a = tracked[i];
        const b = tracked[j];
        const sev = pairwiseSeverityBetweenAnchoredVessels(a, b);
        if (sev !== 'red' && sev !== 'amber') continue;

        const pairKey = [a.mmsi, b.mmsi].sort().join('-');
        activeConflicts.add(pairKey);

        const existing = current.find(al => !al.resolved && al.id === pairKey);
        if (!existing) {
          const alert: AnchorageAlert = {
            id: pairKey,
            vesselMmsi: a.mmsi,
            otherMmsi: b.mmsi,
            vesselName: a.name || a.mmsi,
            otherName: b.name || b.mmsi,
            type: sev === 'red' ? 'collision' : 'rode_conflict',
            state: sev,
            timestamp: Date.now(),
            resolved: false,
          };
          current.push(alert);
          this.newlyRaised.push(alert);
        } else if (existing.state !== sev) {
          existing.state = sev;
          existing.type = sev === 'red' ? 'collision' : 'rode_conflict';
        }
      }
    }

    for (const alert of current) {
      if (!alert.resolved && !activeConflicts.has(alert.id)) {
        alert.resolved = true;
      }
    }

    this.alertsSubject.next(current.slice(-100));
  }

  dismissAlert(alertId: string): void {
    this.alertsSubject.next(
      this.alertsSubject.value.map(a =>
        a.id === alertId ? { ...a, resolved: true } : a,
      ),
    );
  }

  clear(): void {
    this.alertsSubject.next([]);
    this.newlyRaised.length = 0;
  }
}
