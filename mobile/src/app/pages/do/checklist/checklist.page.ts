import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { AlertController, IonContent, ToastController } from '@ionic/angular';
import { confirmChecklistReset } from './checklist-reset';
import { Checklist } from '../../../core/models/bootstrap-content.model';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { scrollToElement } from '../../../core/search/scroll-into-content';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.page.html',
  styleUrls: ['./checklist.page.scss'],
  standalone: false,
})
export class ChecklistPage implements OnInit {
  key = '';
  checklist: Checklist | undefined;
  meta = { title: '', subtitle: '', icon: 'clipboard-outline' };
  pendingItem: string | null = null;

  @ViewChild(IonContent) private ionContent?: IonContent;

  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly route: ActivatedRoute,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.key = params.get('key') ?? '';
      this.checklist = this.content.getChecklist(this.key);
      this.meta = this.content.bootstrap.ui.checklistMeta[this.key] ?? {
        title: '',
        subtitle: '',
        icon: 'clipboard-outline',
      };
      this.scrollToPendingItem();
    });
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((params) => {
      this.pendingItem = params.get('item');
      this.scrollToPendingItem();
    });
  }

  get progressState() {
    return this.progress.checklistProgress(this.key, this.checklist);
  }

  isDone(groupIndex: number, itemIndex: number): boolean {
    return this.progress.isChecklistItemDone(this.key, groupIndex, itemIndex);
  }

  toggle(groupIndex: number, itemIndex: number): void {
    this.progress.toggleChecklistItem(this.key, groupIndex, itemIndex);
  }

  reset(): void {
    void confirmChecklistReset(this.alerts, this.toasts, this.progress, this.key);
  }

  private scrollToPendingItem(): void {
    if (!this.pendingItem || !/^\d+-\d+$/.test(this.pendingItem)) {
      return;
    }
    scrollToElement(this.ionContent, `cl-${this.pendingItem}`);
  }
}
