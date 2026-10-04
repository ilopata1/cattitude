import { TestBed } from '@angular/core/testing';
import { Checklist } from '../models/bootstrap-content.model';
import { ContentService } from './content.service';
import { ProgressService } from './progress.service';
import { VesselContextService } from './vessel-context.service';

describe('checklistProgress', () => {
  let progress: ProgressService;

  const checklist: Checklist = {
    groups: [
      {
        t: 'Brief',
        items: [
          { c: 'I know where my life jacket is' },
          { c: 'Open the seacock', audience: 'crew' },
        ],
      },
    ],
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ProgressService,
        { provide: ContentService, useValue: {} },
        { provide: VesselContextService, useValue: { vesselSlug: 'progress-spec' } },
      ],
    });
    progress = TestBed.inject(ProgressService);
    progress.resetChecklist('brief');
  });

  it('ignores crew items in the guest view and keeps their index', () => {
    progress.toggleChecklistItem('brief', 0, 1);

    const guest = progress.checklistProgress('brief', checklist, 'guest');
    const crew = progress.checklistProgress('brief', checklist, 'crew');
    const all = progress.checklistProgress('brief', checklist);

    expect(guest).toEqual({ done: 0, total: 1, percent: 0 });
    expect(crew).toEqual({ done: 1, total: 2, percent: 50 });
    expect(all).toEqual({ done: 1, total: 2, percent: 50 });

    progress.toggleChecklistItem('brief', 0, 0);
    expect(progress.checklistProgress('brief', checklist, 'guest')).toEqual({
      done: 1,
      total: 1,
      percent: 100,
    });
  });
});
