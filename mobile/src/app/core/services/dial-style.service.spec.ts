import { TestBed } from '@angular/core/testing';
import { DIAL_STYLE_KEY, DialStyleService } from './dial-style.service';

describe('DialStyleService', () => {
  beforeEach(() => {
    localStorage.removeItem(DIAL_STYLE_KEY);
    TestBed.resetTestingModule();
  });

  afterEach(() => {
    localStorage.removeItem(DIAL_STYLE_KEY);
  });

  it('stays on the classic dial until the sailor chooses modern', () => {
    const dial = TestBed.inject(DialStyleService);

    expect(dial.style()).toBe('classic');

    dial.setStyle('modern');

    expect(dial.style()).toBe('modern');
    expect(localStorage.getItem(DIAL_STYLE_KEY)).toBe('modern');
  });

  it('keeps a stored modern choice and ignores anything else', () => {
    localStorage.setItem(DIAL_STYLE_KEY, 'modern');
    expect(TestBed.inject(DialStyleService).style()).toBe('modern');

    TestBed.resetTestingModule();
    localStorage.setItem(DIAL_STYLE_KEY, 'nope');
    expect(TestBed.inject(DialStyleService).style()).toBe('classic');
  });
});
