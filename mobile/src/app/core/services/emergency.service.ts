import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class EmergencyService {
  private readonly openRequest = new Subject<void>();
  readonly open$ = this.openRequest.asObservable();

  requestOpen(): void {
    this.openRequest.next();
  }
}
