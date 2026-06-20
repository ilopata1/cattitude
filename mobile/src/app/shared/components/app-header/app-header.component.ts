import { Component, OnDestroy, OnInit } from '@angular/core';
import { ContentService } from '../../../core/services/content.service';
import { EmergencyService } from '../../../core/services/emergency.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-header',
  templateUrl: './app-header.component.html',
  styleUrls: ['./app-header.component.scss'],
  standalone: false,
})
export class AppHeaderComponent implements OnInit, OnDestroy {
  emergencyOpen = false;
  private emergencySub?: Subscription;

  constructor(
    public readonly content: ContentService,
    private readonly emergency: EmergencyService,
  ) {}

  ngOnInit(): void {
    this.emergencySub = this.emergency.open$.subscribe(() => {
      this.emergencyOpen = true;
    });
  }

  ngOnDestroy(): void {
    this.emergencySub?.unsubscribe();
  }

  openEmergency(): void {
    this.emergencyOpen = true;
  }

  closeEmergency(): void {
    this.emergencyOpen = false;
  }
}
