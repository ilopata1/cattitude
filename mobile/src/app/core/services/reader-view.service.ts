import { Injectable, signal } from '@angular/core';
import { ReaderView } from '../guide/reader-view';

const STORAGE_KEY = 'cattitude.readerView';

@Injectable({ providedIn: 'root' })
export class ReaderViewService {
  private readonly viewSignal = signal<ReaderView>(readStoredView());

  /** Guest is the default. The last choice is remembered on this device. */
  readonly view = this.viewSignal.asReadonly();

  setView(view: ReaderView): void {
    this.viewSignal.set(view);
    try {
      localStorage.setItem(STORAGE_KEY, view);
    } catch {
      /* private mode and full storage can refuse the write */
    }
  }
}

function readStoredView(): ReaderView {
  try {
    return localStorage.getItem(STORAGE_KEY) === 'crew' ? 'crew' : 'guest';
  } catch {
    return 'guest';
  }
}
