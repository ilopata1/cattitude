import { Injectable, OnDestroy, inject } from '@angular/core';
import { SwUpdate, VersionReadyEvent } from '@angular/service-worker';
import { AlertController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';

/**
 * The installed shell otherwise stays cached until every window is closed.
 * WebSocket and polar timers keep the app unstable, so this service asks the
 * worker for an update when the app starts and whenever it returns to the
 * foreground, then prompts before activating that version.
 */
@Injectable({ providedIn: 'root' })
export class AppUpdateService implements OnDestroy {
  private readonly updates = inject(SwUpdate);
  private readonly alerts = inject(AlertController);

  private started = false;
  private listening = false;
  private updateReady = false;
  private prompting = false;
  private checkInFlight: Promise<void> | null = null;
  private versionSub: Subscription | null = null;

  private readonly onVisibility = (): void => {
    if (this.isPageVisible()) {
      this.onForeground();
    }
  };

  private readonly onResume = (): void => {
    this.onForeground();
  };

  /** Begin listening. Safe to call more than once. No-ops when the worker is off (dev). */
  start(): void {
    if (this.started || !this.updates.isEnabled) {
      return;
    }
    this.started = true;
    this.versionSub = this.updates.versionUpdates
      .pipe(filter((event): event is VersionReadyEvent => event.type === 'VERSION_READY'))
      .subscribe(() => {
        this.updateReady = true;
        void this.promptToUpdate();
      });
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', this.onVisibility);
      document.addEventListener('resume', this.onResume);
      this.listening = true;
    }
    void this.checkForUpdate();
  }

  ngOnDestroy(): void {
    this.versionSub?.unsubscribe();
    this.versionSub = null;
    if (this.listening && typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', this.onVisibility);
      document.removeEventListener('resume', this.onResume);
    }
    this.listening = false;
    this.started = false;
  }

  /** Ask the service worker to look for a new shell. */
  checkForUpdate(): Promise<void> {
    if (!this.updates.isEnabled) {
      return Promise.resolve();
    }
    if (this.checkInFlight) {
      return this.checkInFlight;
    }
    this.checkInFlight = this.updates
      .checkForUpdate()
      .then(() => undefined)
      .catch((error: unknown) => {
        console.warn('App update check failed.', error);
      })
      .finally(() => {
        this.checkInFlight = null;
      });
    return this.checkInFlight;
  }

  /** Replaced in tests so a confirm does not reload the Karma window. */
  reloadPage(): void {
    document.location.reload();
  }

  isPageVisible(): boolean {
    return document.visibilityState === 'visible';
  }

  private onForeground(): void {
    void this.checkForUpdate();
    void this.promptToUpdate();
  }

  private async promptToUpdate(): Promise<void> {
    if (!this.updateReady || this.prompting) {
      return;
    }
    this.prompting = true;
    try {
      const alert = await this.alerts.create({
        header: 'Update available',
        message: 'A new version of the app is ready. Reload to use it.',
        buttons: [
          { text: 'Later', role: 'cancel' },
          { text: 'Reload', role: 'confirm' },
        ],
      });
      await alert.present();
      const { role } = await alert.onDidDismiss();
      if (role === 'confirm') {
        await this.activateAndReload();
      }
    } catch (error) {
      console.warn('Could not show the app update prompt.', error);
    } finally {
      this.prompting = false;
    }
  }

  private async activateAndReload(): Promise<void> {
    try {
      await this.updates.activateUpdate();
    } catch (error) {
      console.warn('Could not activate the app update.', error);
      return;
    }
    this.reloadPage();
  }
}
