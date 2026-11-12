import { Component, OnInit } from '@angular/core';
import {
  DUTY_INTERVAL_OPTIONS,
  DutyTask,
  rosterWindow,
} from '../../core/duty/duty-rota';
import { DutyRotaService } from '../../core/services/duty-rota.service';
import { formatWallDay, formatWallTime, parseWall, wallNowMs } from '../../core/wall-time';

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
  /** Closed once a trip is already set, so the roster is what you see. */
  setupOpen = true;
  private taskOpen: Record<string, boolean> = {};
  readonly intervals = DUTY_INTERVAL_OPTIONS;

  constructor(public readonly duty: DutyRotaService) {
    this.setupOpen = !this.duty.rota().startAt || this.duty.named().length === 0;
  }

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

  get setupSummary(): string {
    const start = parseWall(this.duty.rota().startAt);
    const when = start == null ? 'No start time' : `${formatWallDay(start)}, ${formatWallTime(start)}`;
    const names = this.duty.named().map((person) => person.name);
    return `${when} · ${names.length ? names.join(', ') : 'No crew'}`;
  }

  get emptyReason(): string {
    const rota = this.duty.rota();
    if (!rota.startAt) {
      return 'Set when the trip starts. Rotations count forward from that time.';
    }
    if (!this.duty.named().length) {
      return 'Add the crew, then open each task and set who takes it.';
    }
    if (!rota.tasks.some((task) => task.name.trim() && task.sequence.some((id) => this.duty.named().some((person) => person.id === id)))) {
      return 'Open a task and set the order. Each task has its own sequence.';
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

  addTask(): void {
    const before = new Set(this.duty.rota().tasks.map((task) => task.id));
    this.duty.addTask();
    const added = this.duty.rota().tasks.find((task) => !before.has(task.id));
    if (added) {
      this.taskOpen = { ...this.taskOpen, [added.id]: true };
    }
  }

  toggleTask(id: string): void {
    this.taskOpen = { ...this.taskOpen, [id]: !this.taskOpen[id] };
  }

  isTaskOpen(id: string): boolean {
    return this.taskOpen[id] === true;
  }

  taskSummary(task: DutyTask): string {
    const option = this.intervals.find((item) => item.hours === task.intervalHours);
    const names = task.sequence.map((id) => this.crewLabel(id)).filter((name) => name && name !== 'Unnamed');
    return `${option?.label ?? ''} · ${names.length ? names.join(', ') : 'No one yet'}`;
  }

  crewLabel(id: string): string {
    const person = this.duty.rota().crew.find((item) => item.id === id);
    if (!person) {
      return '';
    }
    return person.name.trim() || 'Unnamed';
  }

  setIntervalHours(id: string, hours: number | string): void {
    const value = Number(hours);
    if (!this.intervals.some((option) => option.hours === value)) {
      return;
    }
    this.duty.setInterval(id, value);
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

  trackIndex(index: number): number {
    return index;
  }
}
