import { TestBed } from '@angular/core/testing';
import { CurrentSailService } from './current-sail.service';

describe('CurrentSailService', () => {
  beforeEach(() => {
    localStorage.clear();
    TestBed.configureTestingModule({});
  });

  it('does not ask for notification permission when a sail is chosen', () => {
    const request = typeof Notification === 'undefined'
      ? null
      : spyOn(Notification, 'requestPermission').and.resolveTo('default');
    const service = TestBed.inject(CurrentSailService);

    service.setMain('Full');

    expect(service.selection().main).toBe('Full');
    if (request) {
      expect(request).not.toHaveBeenCalled();
    }
  });
});
