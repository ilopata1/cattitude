import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { AlertController, ToastController } from '@ionic/angular';
import { SailPlan, SailPlanCell, bandsFromCuts, formatBand } from '../../core/models/sail-plan.model';
import { resizeCells, resizeHeavyWeatherCells } from '../../core/services/sail-plan-advisor';
import { clonePlan, SailPlanService } from '../../core/services/sail-plan.service';

@Component({
  selector: 'app-sail-plan',
  templateUrl: './sail-plan.page.html',
  styleUrls: ['./sail-plan.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class SailPlanPage implements OnInit {

  draft!: SailPlan;
  newSail = '';

  constructor(
    private readonly sailPlans: SailPlanService,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.draft = clonePlan(this.sailPlans.plan);
  }

  twaBands() { return bandsFromCuts(this.draft.twaCuts); }
  twsBands() { return bandsFromCuts(this.draft.twsCuts); }
  hwBands() { return bandsFromCuts(this.draft.heavyWeather.twaCuts); }
  formatTwa(i: number) { return formatBand(this.twaBands()[i], '°'); }
  formatTws(i: number) { return formatBand(this.twsBands()[i], 'kn'); }
  formatHw(i: number) { return formatBand(this.hwBands()[i], '°'); }

  altsText(cell: SailPlanCell): string {
    return (cell.alternatives ?? []).join(', ');
  }

  setAlts(cell: SailPlanCell, text: string): void {
    cell.alternatives = text.split(',').map(s => s.trim()).filter(Boolean);
  }

  addSail(): void {
    const name = this.newSail.trim();
    if (!name) return;
    if (!this.draft.sails.includes(name)) this.draft.sails.push(name);
    this.newSail = '';
    this.cdr.markForCheck();
  }

  removeSail(index: number): void {
    this.draft.sails.splice(index, 1);
    this.cdr.markForCheck();
  }

  onHwToggle(): void {
    this.cdr.markForCheck();
  }

  async addCut(kind: 'twa' | 'tws' | 'hw'): Promise<void> {
    const unit = kind === 'tws' ? 'kn' : '°';
    const alert = await this.alerts.create({
      header: `Add ${kind === 'tws' ? 'TWS' : 'TWA'} cutover`,
      message: `Enter a ${unit} value between existing cutovers.`,
      inputs: [{ name: 'value', type: 'number', placeholder: unit }],
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        { text: 'Add', handler: data => this.insertCut(kind, Number(data?.value)) },
      ],
    });
    await alert.present();
  }

  insertCut(kind: 'twa' | 'tws' | 'hw', value: number): boolean {
    if (!Number.isFinite(value)) return false;
    this.mutateCuts(kind, cuts => this.applyCut(cuts, value, kind === 'tws' ? 0 : 0, kind === 'tws' ? 80 : 180));
    return true;
  }

  updateCut(kind: 'twa' | 'tws' | 'hw', index: number, raw: string | number | null): void {
    const value = typeof raw === 'number' ? raw : Number(raw);
    if (!Number.isFinite(value)) return;
    this.mutateCuts(kind, cuts => {
      const next = [...cuts];
      next[index] = value;
      return this.normalize(next, kind === 'tws' ? 0 : 0, kind === 'tws' ? 80 : 180);
    });
  }

  removeCut(kind: 'twa' | 'tws' | 'hw', index: number): void {
    this.mutateCuts(kind, cuts => {
      if (cuts.length <= 2) return cuts;
      const next = [...cuts];
      next.splice(index, 1);
      return this.normalize(next, kind === 'tws' ? 0 : 0, kind === 'tws' ? 80 : 180);
    });
  }

  async save(): Promise<void> {
    this.sailPlans.save(this.draft);
    this.draft = clonePlan(this.sailPlans.plan);
    const toast = await this.toasts.create({
      message: 'Sail plan saved — Polar will use these cutovers for live advice.',
      duration: 2200,
      color: 'success',
    });
    await toast.present();
    this.cdr.markForCheck();
  }

  async resetTemplate(): Promise<void> {
    const alert = await this.alerts.create({
      header: 'Reset to Outremer 55 template?',
      message: 'This replaces your current bands and cell text with the Incidence crossover chart.',
      buttons: [
        { text: 'Cancel', role: 'cancel' },
        {
          text: 'Reset',
          role: 'destructive',
          handler: () => {
            this.sailPlans.resetToTemplate();
            this.draft = clonePlan(this.sailPlans.plan);
            this.cdr.markForCheck();
          },
        },
      ],
    });
    await alert.present();
  }

  trackByIndex(index: number): number { return index; }

  private mutateCuts(kind: 'twa' | 'tws' | 'hw', update: (cuts: number[]) => number[]): void {
    const oldTwa = [...this.draft.twaCuts];
    const oldTws = [...this.draft.twsCuts];
    const oldHw = [...this.draft.heavyWeather.twaCuts];
    const oldCells = this.draft.cells.map(row => row.map(c => ({ ...c, alternatives: [...c.alternatives] })));
    const oldHwCells = this.draft.heavyWeather.cells.map(c => ({ ...c, alternatives: [...c.alternatives] }));

    if (kind === 'twa') this.draft.twaCuts = update(oldTwa);
    else if (kind === 'tws') this.draft.twsCuts = update(oldTws);
    else this.draft.heavyWeather.twaCuts = update(oldHw);

    this.draft.cells = resizeCells(oldTwa, oldTws, oldCells, this.draft.twaCuts, this.draft.twsCuts);
    this.draft.heavyWeather.cells = resizeHeavyWeatherCells(oldHw, oldHwCells, this.draft.heavyWeather.twaCuts);
    this.cdr.markForCheck();
  }

  private applyCut(cuts: number[], value: number, min: number, max: number): number[] {
    return this.normalize([...cuts, value], min, max);
  }

  private normalize(cuts: number[], min: number, max: number): number[] {
    const values = [...new Set(cuts.map(n => Math.min(max, Math.max(min, n))))]
      .filter(n => Number.isFinite(n))
      .sort((a, b) => a - b);
    return values.length >= 2 ? values : [min, max];
  }
}
