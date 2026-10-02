import { CUSTOM_ELEMENTS_SCHEMA } from '@angular/core';
import { TestBed } from '@angular/core/testing';

import { AppComponent } from './app.component';
import { AppUpdateService } from './core/services/app-update.service';
import { NotificationBridgeService } from './core/services/notification-bridge.service';
import { LogbookTriggerService } from './core/services/logbook-trigger.service';
import { SailWatchService } from './core/services/sail-watch.service';

describe('AppComponent', () => {

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [AppComponent],
      schemas: [CUSTOM_ELEMENTS_SCHEMA],
      providers: [
        { provide: NotificationBridgeService, useValue: { start: () => undefined } },
        { provide: SailWatchService, useValue: { ensureRunning: () => undefined } },
        { provide: LogbookTriggerService, useValue: { ensureRunning: () => undefined } },
        { provide: AppUpdateService, useValue: { start: () => undefined } },
      ],
    }).compileComponents();
  });

  it('should create the app', () => {
    const fixture = TestBed.createComponent(AppComponent);
    const app = fixture.componentInstance;
    expect(app).toBeTruthy();
  });

});
