import { Injectable, OnDestroy, inject } from '@angular/core';
import { Subscription } from 'rxjs';
import { CurrentSailService } from './current-sail.service';
import { LogbookRemoteService } from './logbook-remote.service';
import { LogbookService } from './logbook.service';

/**
 * Publishes the sail set, duty rota, and passage to the boat recorder.
 * The boat writes the log. This service does not create entries.
 */
@Injectable({ providedIn: 'root' })
export class LogbookTriggerService implements OnDestroy {
  private readonly logbook = inject(LogbookService);
  private readonly sails = inject(CurrentSailService);
  private readonly remote = inject(LogbookRemoteService);

  private started = false;
  private busy = false;
  private subs: Subscription[] = [];
  private clock: ReturnType<typeof setInterval> | null = null;

  ensureRunning(): void {
    if (this.started) return;
    this.started = true;
    void this.logbook.ensureReady().catch(() => undefined);
    this.subs.push(
      this.sails.changed$.subscribe(() => void this.publish()),
    );
    this.clock = setInterval(() => void this.publish(), 30_000);
    void this.publish();
  }

  ngOnDestroy(): void {
    this.subs.forEach(sub => sub.unsubscribe());
    if (this.clock) clearInterval(this.clock);
  }

  /** Sail changes and the rota go up to the boat, which writes the row. */
  private async publish(): Promise<void> {
    if (this.busy) return;
    this.busy = true;
    try {
      await this.logbook.ensureReady();
      await this.remote.refresh();
      await this.logbook.syncWatchFromDuty();
      await this.logbook.publishContext();
    } catch {
      /* The next tick sends the latest sail set and rota. */
    } finally {
      this.busy = false;
    }
  }
}
