import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { GuideLoadService } from '../../core/services/guide-load.service';

@Component({
  selector: 'app-vessel-error',
  templateUrl: './vessel-error.page.html',
  styleUrls: ['./vessel-error.page.scss'],
  standalone: false,
})
export class VesselErrorPage {
  constructor(
    private readonly route: ActivatedRoute,
    public readonly guideLoad: GuideLoadService,
  ) {}

  get slug(): string {
    return this.route.snapshot.paramMap.get('vesselSlug') ?? 'unknown';
  }
}
