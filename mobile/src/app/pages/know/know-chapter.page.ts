import { Component, DestroyRef, OnInit, ViewChild, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { ActivatedRoute } from '@angular/router';
import { IonContent } from '@ionic/angular';
import { classifySection } from '../../core/guide/chapter-presentation';
import {
  isPowerPart,
  POWER_TOPIC_ID,
  powerScrollTarget,
  sectionDomId,
} from '../../core/guide/power-topic';
import { SystemModule } from '../../core/models/bootstrap-content.model';
import { ContentService } from '../../core/services/content.service';
import { knowChapterRoute } from '../../core/guide/dashboard';
import { VesselRouteService } from '../../core/services/vessel-route.service';
import { scrollToElement } from '../../core/search/scroll-into-content';
import { GuideChapterComponent } from '../../shared/components/guide-chapter/guide-chapter.component';

@Component({
  selector: 'app-know-chapter',
  templateUrl: './know-chapter.page.html',
  styleUrls: ['./know.page.scss'],
  standalone: false,
})
export class KnowChapterPage implements OnInit {
  system: SystemModule | null = null;
  power = false;
  missing = false;
  title = '';
  subtitle = '';

  @ViewChild(IonContent) private ionContent?: IonContent;
  @ViewChild(GuideChapterComponent) private chapter?: GuideChapterComponent;

  private pendingSystemId: string | null = null;
  private pendingSection: number | null = null;
  private readonly destroyRef = inject(DestroyRef);

  constructor(
    public readonly content: ContentService,
    private readonly route: ActivatedRoute,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  ngOnInit(): void {
    this.route.paramMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
    this.route.queryParamMap.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.load());
  }

  openLinked(id: string): void {
    const target = isPowerPart(id) || id === POWER_TOPIC_ID ? (id === POWER_TOPIC_ID ? POWER_TOPIC_ID : id) : id;
    const route = knowChapterRoute(target);
    void this.vesselRoutes.navigateTabsWithExtras(route.segments, { queryParams: route.query });
  }

  private load(): void {
    const systemId = (this.route.snapshot.paramMap.get('systemId') || '').trim();
    const section = this.route.snapshot.queryParamMap.get('section');
    const sectionIndex = section == null || section === '' ? null : Number(section);
    this.pendingSection = sectionIndex;
    if (!systemId) {
      this.missing = true;
      return;
    }
    if (systemId === POWER_TOPIC_ID || isPowerPart(systemId)) {
      this.power = true;
      this.system = null;
      this.missing = false;
      this.title = 'Power';
      this.subtitle = 'Electrical, controls, and batteries';
      this.pendingSystemId = systemId === POWER_TOPIC_ID ? null : systemId;
      this.scrollPending();
      return;
    }
    const system = this.content.getSystem(systemId) ?? null;
    this.power = false;
    this.system = system;
    this.missing = !system;
    this.title = system?.title ?? 'Know';
    this.subtitle = system?.subtitle ?? '';
    this.pendingSystemId = system?.id ?? null;
    if (system) {
      this.scrollPending();
    }
  }

  private scrollPending(): void {
    if (this.power) {
      scrollToElement(this.ionContent, 'know-sec-top', () => {
        const power = this.chapter?.power();
        if (!power) {
          return;
        }
        const target = powerScrollTarget(power, this.pendingSystemId, this.pendingSection);
        if (target.inReference) {
          this.chapter?.expandReference();
        }
        if (target.domId !== 'know-sec-top') {
          scrollToElement(this.ionContent, target.domId);
        }
      });
      return;
    }
    const index = this.pendingSection;
    const section =
      this.system && index != null && !Number.isNaN(index)
        ? this.system.sections[index]
        : undefined;
    const inReference = !!section && classifySection(section).role === 'reference';
    const id =
      !this.system || index == null || Number.isNaN(index)
        ? 'know-sec-top'
        : sectionDomId(this.system.id, index);
    scrollToElement(
      this.ionContent,
      id,
      inReference ? () => this.chapter?.expandReference() : undefined,
    );
  }
}
