import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';
import { CHECKLIST_META } from '../../../core/config/vessel-ui.config';
import { Checklist } from '../../../core/models/bootstrap-content.model';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';

@Component({
  selector: 'app-checklist',
  templateUrl: './checklist.page.html',
  styleUrls: ['./checklist.page.scss'],
  standalone: false,
})
export class ChecklistPage implements OnInit {
  key = '';
  checklist: Checklist | undefined;
  meta = { title: '', subtitle: '', icon: '📋' };

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly route: ActivatedRoute,
    private readonly location: Location,
  ) {}

  ngOnInit(): void {
    this.key = this.route.snapshot.paramMap.get('key') ?? '';
    this.checklist = this.content.getChecklist(this.key);
    this.meta = CHECKLIST_META[this.key] ?? this.meta;
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
    this.progress.resetChecklist(this.key);
  }

  back(): void {
    this.location.back();
  }
}
