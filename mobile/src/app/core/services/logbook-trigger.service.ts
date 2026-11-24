import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CurrentSailService } from './current-sail.service';
import { DutyRotaService } from './duty-rota.service';
import { HouseBatterySettingsService } from './house-battery-settings.service';
import { LogbookRemoteService } from './logbook-remote.service';
import { LogbookService } from './logbook.service';

/**
 * Keeps this device and the boat recorder in step. Every 30 s it reads the boat's
 * status and takes what other devices changed. It sends the sail set or the rota only
 * when someone changes them on this device. The boat writes the log.
 */
@Injectable({ providedIn: 'root' })
export class LogbookTriggerService implements OnDestroy {
  private readonly logbook = inject(LogbookService);
  private readonly sails = inject(CurrentSailService);
  private readonly remote = inject(LogbookRemoteService);
  private readonly duty = inject(DutyRotaService);
  private readonly houseBattery = inject(HouseBatterySettingsService);

  private started = false;
  private busy = false;
  private subs: Subscription[] = [];
  private clock: ReturnType<typeof setInterval> | null = null;

  ensureRunning(): void {
    if (this.started) return;
    this.started = true;
    void this.logbook.ensureReady().catch(() => undefined);
    this.subs.push(
      this.sails.localChange$.subscribe(() => void this.send(['sails'])),
      this.duty.changed$.subscribe(() => void this.send(['rota'])),
      this.houseBattery.localChange$.subscribe(() => void this.send(['alerts'])),
    );
    this.clock = setInterval(() => void this.heartbeat(), 30_000);
    void this.heartbeat();
  }

  /** Read the boat now, for example when the app comes back on screen. */
  poke(): void {
    void this.heartbeat();
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
    if (this.clock) clearInterval(this.clock);
  }

  private async send(parts: ('sails' | 'rota' | 'alerts')[]): Promise<void> {
    try {
      await this.logbook.ensureReady();
      await this.logbook.publishContext(parts);
    } catch {
      /* The next heartbeat finds the boat's copy, and the next change is sent again. */
    }
  }

  private async heartbeat(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.logbook.ensureReady();
      await this.remote.refresh();
      if (this.remote.revs()) {
        await this.logbook.syncFromBoat();
        await this.logbook.syncWatchFromDuty();
        await this.logbook.publishAdvice();
        await this.logbook.syncBoatTrack();
      } else {
        // A recorder from before revisions: keep the old full publish.
        await this.logbook.syncWatchFromDuty();
        await this.logbook.publishContext();
      }
    } catch {
      /* The next tick tries again. */
    } finally {
      this.busy = false;
    }
  }
}
