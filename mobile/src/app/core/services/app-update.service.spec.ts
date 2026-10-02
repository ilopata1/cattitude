import { TestBed } from '@angular/core/testing';
import { SwUpdate } from '@angular/service-worker';
import { AlertController } from '@ionic/angular';
import { Subject } from 'rxjs';
import { AppUpdateService } from './app-update.service';

function flushPromises(): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, 0));
}

describe('AppUpdateService', () => {
  let service: AppUpdateService;
  let versionUpdates: Subject<{ type: string; currentVersion?: { hash: string }; latestVersion?: { hash: string } }>;
  let updates: {
    isEnabled: boolean;
    versionUpdates: Subject<{ type: string }>;
    checkForUpdate: jasmine.Spy;
    activateUpdate: jasmine.Spy;
  };
  let dismissRole: string;
  let alerts: { create: jasmine.Spy };

  beforeEach(() => {
    versionUpdates = new Subject();
    updates = {
      isEnabled: true,
      versionUpdates,
      checkForUpdate: jasmine.createSpy('checkForUpdate').and.resolveTo(false),
      activateUpdate: jasmine.createSpy('activateUpdate').and.resolveTo(true),
    };
    dismissRole = 'confirm';
    alerts = {
      create: jasmine.createSpy('create').and.callFake(() =>
        Promise.resolve({
          present: () => Promise.resolve(),
          onDidDismiss: () => Promise.resolve({ role: dismissRole }),
        }),
      ),
    };

    TestBed.configureTestingModule({
      providers: [
        AppUpdateService,
        { provide: SwUpdate, useValue: updates },
        { provide: AlertController, useValue: alerts },
      ],
    });
    service = TestBed.inject(AppUpdateService);
    spyOn(service, 'reloadPage');
  });

  afterEach(() => {
    service.ngOnDestroy();
  });

  it('checks when the app starts, becomes visible, or resumes', async () => {
    spyOn(service, 'isPageVisible').and.returnValue(true);
    service.start();
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    await flushPromises();

    updates.checkForUpdate.calls.reset();
    document.dispatchEvent(new Event('visibilitychange'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(1);
    await flushPromises();

    document.dispatchEvent(new Event('resume'));
    expect(updates.checkForUpdate).toHaveBeenCalledTimes(2);
  });

  it('does not check when a visibility change leaves the page hidden', () => {
    service.start();
    updates.checkForUpdate.calls.reset();
    spyOn(service, 'isPageVisible').and.returnValue(false);

    document.dispatchEvent(new Event('visibilitychange'));

    expect(updates.checkForUpdate).not.toHaveBeenCalled();
  });

  it('reloads after the user confirms a downloaded version', async () => {
    service.start();
    versionUpdates.next({
      type: 'VERSION_READY',
      currentVersion: { hash: 'old' },
      latestVersion: { hash: 'new' },
    });
    await flushPromises();
    await flushPromises();

    expect(alerts.create).toHaveBeenCalled();
    expect(updates.activateUpdate).toHaveBeenCalled();
    expect(service.reloadPage).toHaveBeenCalled();
  });

  it('leaves the current shell running when the user defers the update', async () => {
    dismissRole = 'cancel';
    service.start();
    versionUpdates.next({ type: 'VERSION_READY' });
    await flushPromises();
    await flushPromises();

    expect(alerts.create).toHaveBeenCalled();
    expect(updates.activateUpdate).not.toHaveBeenCalled();
    expect(service.reloadPage).not.toHaveBeenCalled();
  });

  it('does nothing while the service worker is disabled', () => {
    updates.isEnabled = false;
    service.start();
    document.dispatchEvent(new Event('visibilitychange'));
    document.dispatchEvent(new Event('resume'));
    versionUpdates.next({ type: 'VERSION_READY' });

    expect(updates.checkForUpdate).not.toHaveBeenCalled();
    expect(alerts.create).not.toHaveBeenCalled();
  });
});
