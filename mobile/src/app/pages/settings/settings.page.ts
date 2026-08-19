import { Component, OnDestroy, OnInit } from '@angular/core';
import { FormControl, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SignalKService, SignalKConnectionState } from '../../core/services/signal-k.service';
import { SignalKSettingsService } from '../../core/services/signal-k-settings.service';

@Component({
  selector: 'app-settings',
  templateUrl: './settings.page.html',
  styleUrls: ['./settings.page.scss'],
  standalone: false,
})
export class SettingsPage implements OnInit, OnDestroy {

  urlControl = new FormControl('', [Validators.pattern(/^(https?|wss?):\/\/.+|[a-zA-Z0-9.-]+(:\d+)?$/)]);

  connectionState: SignalKConnectionState = 'disconnected';
  selfContext = '';
  lastError = '';

  private subs: Subscription[] = [];

  constructor(
    private readonly sk: SignalKService,
    private readonly skSettings: SignalKSettingsService,
  ) {}

  ngOnInit(): void {
    this.urlControl.setValue(this.skSettings.url);

    this.subs.push(
      this.sk.state$.subscribe(state => {
        this.connectionState = state;
        if (state !== 'error') this.lastError = '';
      }),
      this.sk.self$.subscribe(self => { this.selfContext = self; }),
      this.sk.error$.subscribe(err => { this.lastError = err; }),
    );
  }

  ngOnDestroy(): void {
    this.subs.forEach(s => s.unsubscribe());
  }

  get stateLabel(): string {
    switch (this.connectionState) {
      case 'connected':    return 'Connected';
      case 'connecting':   return 'Connecting…';
      case 'error':        return 'Error';
      case 'disconnected': return 'Disconnected';
    }
  }

  get stateColor(): string {
    switch (this.connectionState) {
      case 'connected':    return 'success';
      case 'connecting':   return 'warning';
      case 'error':        return 'danger';
      case 'disconnected': return 'medium';
    }
  }

  saveAndConnect(): void {
    if (this.urlControl.invalid) return;
    const url = (this.urlControl.value ?? '').trim();
    this.skSettings.setUrl(url);
    if (url) {
      this.sk.connect();
    } else {
      this.sk.disconnect();
    }
  }

  disconnect(): void {
    this.sk.disconnect();
  }
}
