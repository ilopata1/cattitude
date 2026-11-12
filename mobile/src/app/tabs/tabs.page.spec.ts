import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { NavController } from '@ionic/angular';
import { of } from 'rxjs';
import { SignalKSettingsService } from '../core/services/signal-k-settings.service';
import { VesselRouteService } from '../core/services/vessel-route.service';
import { isMoreMenuUrl, TabsPage } from './tabs.page';

describe('isMoreMenuUrl', () => {
  it('matches only the More menu', () => {
    expect(isMoreMenuUrl('/v/cattitude/tabs/more')).toBeTrue();
    expect(isMoreMenuUrl('/v/sister%20test/tabs/more/')).toBeTrue();
    expect(isMoreMenuUrl('/v/cattitude/tabs/more?from=home')).toBeTrue();
    expect(isMoreMenuUrl('/v/cattitude/tabs/more/polar')).toBeFalse();
    expect(isMoreMenuUrl('/v/cattitude/tabs/more/settings/sail-plan')).toBeFalse();
    expect(isMoreMenuUrl('/v/cattitude/tabs/home')).toBeFalse();
    expect(isMoreMenuUrl('/v/cattitude/tabs/sail')).toBeFalse();
  });
});

describe('TabsPage More tab', () => {
  let fixture: ComponentFixture<TabsPage>;
  let navigateRoot: jasmine.Spy;
  let router: { url: string };

  beforeEach(async () => {
    navigateRoot = jasmine.createSpy('navigateRoot').and.resolveTo(true);
    router = { url: '/v/cattitude/tabs/home' };
    await TestBed.configureTestingModule({
      declarations: [TabsPage],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: Router, useValue: router },
        { provide: NavController, useValue: { navigateRoot } },
        {
          provide: VesselRouteService,
          useValue: { tabs: (...segments: string[]) => ['/v', 'cattitude', 'tabs', ...segments] },
        },
        { provide: SignalKSettingsService, useValue: { url$: of('') } },
      ],
    }).compileComponents();
    fixture = TestBed.createComponent(TabsPage);
    fixture.detectChanges();
  });

  function clickTab(tab: string): boolean {
    const child = document.createElement('button');
    fixture.nativeElement.appendChild(child);
    let bubbled = false;
    fixture.nativeElement.addEventListener('ionTabButtonClick', () => {
      bubbled = true;
    });
    child.dispatchEvent(new CustomEvent('ionTabButtonClick', {
      bubbles: true,
      detail: { tab },
    }));
    child.remove();
    return bubbled;
  }

  it('opens the More menu from Home instead of restoring the last More page', () => {
    router.url = '/v/cattitude/tabs/home';

    const bubbled = clickTab('more');

    expect(bubbled).toBeFalse();
    expect(navigateRoot).toHaveBeenCalledOnceWith(['/v', 'cattitude', 'tabs', 'more'], {
      animated: true,
      animationDirection: 'back',
    });
  });

  it('opens the More menu from a page that was reached through More', () => {
    router.url = '/v/cattitude/tabs/more/polar';

    clickTab('more');

    expect(navigateRoot).toHaveBeenCalledOnceWith(['/v', 'cattitude', 'tabs', 'more'], {
      animated: true,
      animationDirection: 'back',
    });
  });

  it('leaves the More menu in place when it is already showing', () => {
    router.url = '/v/cattitude/tabs/more';

    const bubbled = clickTab('more');

    expect(bubbled).toBeFalse();
    expect(navigateRoot).not.toHaveBeenCalled();
  });

  it('lets the other tabs restore their own stacks', () => {
    const bubbled = clickTab('home');

    expect(bubbled).toBeTrue();
    expect(navigateRoot).not.toHaveBeenCalled();
  });
});
