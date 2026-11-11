import { Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { liveToast } from '../../../core/toast-live';
import { InspectionDay } from '../../../core/inspection/inspection';
import {
  WALK_AROUND,
  WALK_AROUND_INTRO,
  WALK_AROUND_WARNING,
  WalkItem,
  walkItemIds,
} from '../../../core/inspection/walk-around';
import { DutyRotaService } from '../../../core/services/duty-rota.service';
import { InspectionService } from '../../../core/services/inspection.service';
import { formatDateKey } from '../../../core/wall-time';

@Component({
  selector: 'app-inspection',
  templateUrl: './inspection.page.html',
  styleUrls: ['./inspection.page.scss'],
  standalone: false,
})
export class InspectionPage implements OnInit {
  date = '';
  draft: Record<string, string> = {};
  readonly groups = WALK_AROUND;
  readonly intro = WALK_AROUND_INTRO;
  readonly warning = WALK_AROUND_WARNING;

  constructor(
    public readonly inspections: InspectionService,
    private readonly duty: DutyRotaService,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController,
  ) {}

  ngOnInit(): void {
    this.inspections.open();
    this.duty.open();
    this.date = this.inspections.todayKey();
    this.loadDraft();
  }

  get today(): string {
    return this.inspections.todayKey();
  }

  get readonly(): boolean {
    return this.date < this.today;
  }

  get progress() {
    return this.inspections.progress(this.date);
  }

  get who(): string | null {
    if (this.date !== this.today) {
      return null;
    }
    return this.duty.assigneeName('inspection');
  }

  dayLabel(date: string): string {
    return formatDateKey(date);
  }

  pick(value: string): void {
    if (!value || value === this.date) {
      return;
    }
    this.date = value;
    this.loadDraft();
  }

  isDone(id: string): boolean {
    return this.inspections.isDone(this.date, id);
  }

  toggle(id: string): void {
    if (this.readonly) {
      return;
    }
    this.inspections.toggle(this.date, id);
  }

  editNote(id: string, value: string): void {
    this.draft[id] = value;
    this.inspections.setNote(this.date, id, value);
  }

  async clear(): Promise<void> {
    const previous = this.inspections.day(this.date);
    const alert = await this.alerts.create({
      header: "Clear today's inspection?",
      message: 'Ticks and notes for today will be removed. Earlier days stay in the list.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Clear',
          role: 'destructive',
          handler: () => {
            this.inspections.clear(this.date);
            this.loadDraft();
            void this.offerUndo(previous);
          },
        },
      ],
    });
    await alert.present();
  }

  trackGroup(_: number, group: { title: string }): string {
    return group.title;
  }

  trackItem(_: number, item: WalkItem): string {
    return item.id;
  }

  trackDay(_: number, day: InspectionDay): string {
    return day.date;
  }

  private loadDraft(): void {
    const marks = this.inspections.day(this.date).marks;
    const draft: Record<string, string> = {};
    for (const id of walkItemIds()) {
      draft[id] = marks[id]?.note ?? '';
    }
    this.draft = draft;
  }

  private async offerUndo(previous: InspectionDay): Promise<void> {
    const toast = await this.toasts.create(liveToast({
      message: 'Inspection cleared',
      duration: 6000,
      position: 'bottom',
      buttons: [
        {
          text: 'Undo',
          handler: () => {
            this.inspections.restoreDay(previous);
            if (this.date === previous.date) {
              this.loadDraft();
            }
          },
        },
      ],
    }));
    await toast.present();
  }
}
