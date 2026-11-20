import { Component, inject } from '@angular/core';
import { CoachService } from '../../../core/services/coach.service';

@Component({
  selector: 'app-coach-card',
  templateUrl: './coach-card.component.html',
  styleUrls: ['./coach-card.component.scss'],
  standalone: false,
})
export class CoachCardComponent {
  readonly coach = inject(CoachService);

  refresh(): void {
    this.coach.refresh();
  }

  toggleExpanded(expanded: boolean): void {
    this.coach.setExpanded(!expanded);
  }

  toggleLongForm(longForm: boolean): void {
    this.coach.setLongForm(!longForm);
  }
}
