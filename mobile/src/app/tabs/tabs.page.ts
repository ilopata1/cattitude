import { Component, DestroyRef, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { SignalKSettingsService } from '../core/services/signal-k-settings.service';

@Component({
  selector: 'app-tabs',
  templateUrl: 'tabs.page.html',
  styleUrls: ['tabs.page.scss'],
  standalone: false,
})
export class TabsPage {
  showSailTab = false;

  constructor() {
    const settings = inject(SignalKSettingsService);
    settings.url$.pipe(takeUntilDestroyed(inject(DestroyRef))).subscribe((url) => {
      this.showSailTab = !!url.trim();
    });
  }
}
