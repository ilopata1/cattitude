import { Component, DestroyRef, ElementRef, inject, NgZone } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { SignalKSettingsService } from '../core/services/signal-k-settings.service';
import { VesselRouteService } from '../core/services/vessel-route.service';

/**
 * True for the More menu itself (`/v/:slug/tabs/more`), not a page opened from it.
 */
export function isMoreMenuUrl(url: string): boolean {
  const path = url.split(/[?#]/)[0];
  const segments = path.split('/').filter((part) => part.length > 0);
  return segments.length === 4 && segments[0] === 'v' && segments[2] === 'tabs' && segments[3] === 'more';
}

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
    const destroyRef = inject(DestroyRef);
    settings.url$.pipe(takeUntilDestroyed(destroyRef)).subscribe((url) => {
      this.showSailTab = !!url.trim();
    });

    // Ionic restores the last page in a tab when that tab is selected again.
    // More is a menu, so that restore skips the menu and, because the restore
    // is a root navigation, drops the menu from the stack. Back then follows
    // browser history to Home. Open the menu itself instead.
    const host = inject(ElementRef<HTMLElement>).nativeElement;
    const zone = inject(NgZone);
    const router = inject(Router);
    const nav = inject(NavController);
    const routes = inject(VesselRouteService);
    const onTabButton = (event: Event): void => {
      const tab = (event as CustomEvent<{ tab?: string }>).detail?.tab;
      if (tab !== 'more') {
        return;
      }
      event.stopPropagation();
      if (isMoreMenuUrl(router.url)) {
        return;
      }
      zone.run(() => {
        void nav.navigateRoot(routes.tabs('more'), {
          animated: true,
          animationDirection: 'back',
        });
      });
    };
    host.addEventListener('ionTabButtonClick', onTabButton, true);
    destroyRef.onDestroy(() => host.removeEventListener('ionTabButtonClick', onTabButton, true));
  }
}
