import { Component, OnInit } from '@angular/core';
import {
  DUTY_INTERVAL_OPTIONS,
  rosterWindow,
} from '../../core/duty/duty-rota';
import { DutyRotaService } from '../../core/services/duty-rota.service';
import { wallNowMs } from '../../core/wall-time';

@Component({
  selector: 'app-duty',
  templateUrl: './duty.page.html',
  styleUrls: ['./duty.page.scss'],
  standalone: false,
})
export class DutyPage implements OnInit {
  pastDays = 0;
  futureDays = 7;
  crewId: string | null = null;
  readonly intervals = DUTY_INTERVAL_OPTIONS;

  constructor(public readonly duty: DutyRotaService) {}

  ngOnInit(): void {
    this.duty.open();
  }

  get filterId(): string | null {
    if (!this.crewId) {
      return null;
    }
    return this.duty.rota().crew.some((person) => person.id === this.crewId) ? this.crewId : null;
  }

  get roster() {
    return rosterWindow(this.duty.rota(), wallNowMs(), this.pastDays, this.futureDays, this.filterId);
  }

  get emptyReason(): string {
    const rota = this.duty.rota();
    if (!rota.startAt) {
      return 'Set when the trip starts. Rotations count forward from that time.';
    }
    if (!this.duty.named().length) {
      return 'Add the crew. The first name takes the first watch, then the list repeats.';
    }
    if (!rota.tasks.some((task) => task.name.trim())) {
      return 'Add a task to build the roster.';
    }
    if (this.filterId) {
      return 'Nothing for this person in this range.';
    }
    return 'Nothing in this range.';
  }

  setStart(event: Event): void {
    this.duty.setStart((event.target as HTMLInputElement).value);
  }

  renameCrew(id: string, event: Event): void {
    this.duty.renameCrew(id, (event.target as HTMLInputElement).value);
  }

  renameTask(id: string, event: Event): void {
    this.duty.renameTask(id, (event.target as HTMLInputElement).value);
  }

  setIntervalHours(id: string, hours: number | string): void {
    this.duty.setInterval(id, Number(hours));
  }

  earlier(): void {
    this.pastDays += 7;
  }

  later(): void {
    this.futureDays = Math.min(60, this.futureDays + 7);
  }

  trackCrew(_: number, person: { id: string }): string {
    return person.id;
  }

  trackTask(_: number, task: { id: string }): string {
    return task.id;
  }

  trackDay(_: number, day: { key: string }): string {
    return day.key;
  }

  trackColumn(_: number, column: { id: string }): string {
    return column.id;
  }

  trackRow(_: number, row: { startMs: number }): string {
    return String(row.startMs);
  }
}
