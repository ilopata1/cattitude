import { Component } from '@angular/core';
import { Location } from '@angular/common';
import {
  groupTopics,
  POWER_TOPIC_ID,
  powerSubtitle,
  topicIcon,
  topicTitle,
} from '../../../core/guide/power-topic';
import { ContentService } from '../../../core/services/content.service';
import { ProgressService } from '../../../core/services/progress.service';
import { VesselRouteService } from '../../../core/services/vessel-route.service';
import { LearnCheck, SystemModule } from '../../../core/models/bootstrap-content.model';

interface LearnRow {
  id: string;
  title: string;
  subtitle: string;
  icon: string;
  summary: string;
  systems: SystemModule[];
  checks: Array<{ system: SystemModule; check: string | LearnCheck }>;
}

@Component({
  selector: 'app-learn',
  templateUrl: './learn.page.html',
  styleUrls: ['./learn.page.scss'],
  standalone: false,
})
export class LearnPage {
  openId: string | null = null;

  constructor(
    public readonly content: ContentService,
    public readonly progress: ProgressService,
    private readonly location: Location,
    private readonly vesselRoutes: VesselRouteService,
  ) {}

  get rows(): LearnRow[] {
    return groupTopics(this.content.getSystemsOrdered()).map((topic) => ({
      id: topic.id,
      title: topicTitle(topic),
      subtitle: topic.id === POWER_TOPIC_ID ? powerSubtitle(topic.systems) : topic.systems[0]?.subtitle || '',
      icon: topicIcon(topic),
      summary: topic.id === POWER_TOPIC_ID ? '' : topic.systems[0]?.summary || '',
      systems: topic.systems,
      checks: topic.systems.reduce<LearnRow['checks']>((all, system) => {
        for (const check of system.learnChecks ?? []) {
          all.push({ system, check });
        }
        return all;
      }, []),
    }));
  }

  get progressState() {
    return this.progress.learnProgress();
  }

  toggleOpen(id: string): void {
    this.openId = this.openId === id ? null : id;
  }

  toggleDone(row: LearnRow, event: Event): void {
    event.stopPropagation();
    this.progress.toggleSystems(row.systems);
  }

  isDone(row: LearnRow): boolean {
    return this.progress.isTopicDone(row.systems);
  }

  toggleCheck(system: SystemModule, check: string | LearnCheck): void {
    this.progress.toggleCheck(system, check);
  }

  isCheckDone(system: SystemModule, check: string | LearnCheck): boolean {
    return this.progress.isCheckDone(system, check);
  }

  checkText(check: string | LearnCheck): string {
    return typeof check === 'string' ? check : check.text;
  }

  openSystemDetail(id: string, event: Event): void {
    event.stopPropagation();
    void this.vesselRoutes.navigateTabsWithExtras(['know'], {
      queryParams: { system: id },
    });
  }

  back(): void {
    this.location.back();
  }
}
