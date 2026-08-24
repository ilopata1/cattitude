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
  private readonly comboCache = new WeakMap<SailPlanCell, Record<string, { raw: string; sails: string[] }>>();

  constructor(
    private readonly sailPlans: SailPlanService,
    private readonly alerts: AlertController,
    private readonly toasts: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.draft = clonePlan(this.sailPlans.plan);
    void this.refreshDraft();
  }

  twaBands() { return bandsFromCuts(this.draft.twaCuts); }
  twsBands() { return bandsFromCuts(this.draft.twsCuts); }
  hwBands() { return bandsFromCuts(this.draft.heavyWeather.twaCuts); }
  formatTwa(i: number) { return formatBand(this.twaBands()[i], '°'); }
  formatTws(i: number) { return formatBand(this.twsBands()[i], 'kn'); }
  formatHw(i: number) { return formatBand(this.hwBands()[i], '°'); }

  primarySails(cell: SailPlanCell): string[] {
    return this.cachedCombo(cell, 'p', cell.primary);
  }

  altSails(cell: SailPlanCell): string[] {
    return this.cachedCombo(cell, 'a', (cell.alternatives ?? []).join(' + '));
  }

  avoidSails(cell: SailPlanCell): string[] {
    return this.cachedCombo(cell, 'v', cell.avoid ?? '');
  }

  sailOptions(selected: string[]): string[] {
    const inv = this.draft?.sails ?? [];
    const extra = selected.filter(s => !inv.some(i => i.toLowerCase() === s.toLowerCase()));
    return [...inv, ...extra];
  }

  setPrimarySails(cell: SailPlanCell, value: string[] | string | null | undefined): void {
    cell.primary = this.formatCombo(this.asList(value));
    this.cdr.markForCheck();
  }

  setAltSails(cell: SailPlanCell, value: string[] | string | null | undefined): void {
    cell.alternatives = this.asList(value);
    this.cdr.markForCheck();
  }

  setAvoidSails(cell: SailPlanCell, value: string[] | string | null | undefined): void {
    cell.avoid = this.formatCombo(this.asList(value)) || undefined;
    this.cdr.markForCheck();
  }

  addSail(): void {
    const name = this.newSail.trim();
    if (!name) return;
    if (!this.draft.sails.some(s => s.toLowerCase() === name.toLowerCase())) {
      this.draft.sails.push(name);
    }
    this.newSail = '';
    this.cdr.markForCheck();
  }

  removeSail(index: number): void {
    const [removed] = this.draft.sails.splice(index, 1);
    if (removed) this.stripSail(removed);
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

  updateCut(kind: 'twa' | 'tws' | 'hw', index: number, raw: string | number | null | undefined): void {
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
    const remote = await this.sailPlans.save(this.draft);
    this.draft = clonePlan(this.sailPlans.plan);
    const toast = await this.toasts.create({
      message: remote
        ? 'Sail plan saved for this vessel — Polar will use these cutovers for live advice.'
        : 'Saved on this device, but the server could not be reached. Try Save again when you are online.',
      duration: 2200,
      color: remote ? 'success' : 'warning',
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
            void this.applyTemplateReset();
          },
        },
      ],
    });
    await alert.present();
  }

  trackByIndex(index: number): number { return index; }

  trackBySail(_: number, sail: string): string { return sail; }

  private cachedCombo(cell: SailPlanCell, kind: string, raw: string): string[] {
    let bag = this.comboCache.get(cell);
    if (!bag) {
      bag = {};
      this.comboCache.set(cell, bag);
    }
    const hit = bag[kind];
    if (hit && hit.raw === raw) return hit.sails;
    const sails = this.parseCombo(raw);
    bag[kind] = { raw, sails };
    return sails;
  }

  private asList(value: string[] | string | null | undefined): string[] {
    const list = Array.isArray(value) ? value : value ? [value] : [];
    return this.unique(list.map(s => this.canonical(s)).filter(Boolean));
  }

  private parseCombo(text: string | undefined): string[] {
    if (!text?.trim()) return [];
    const raw = text.trim();
    const parts = raw.split(/\s*(?:\+|\/|,|;|&|\band\b)\s*/i).map(s => s.trim()).filter(Boolean);
    const canon = parts.map(p => this.canonical(p));
    const anyInventory = canon.some(p => this.inInventory(p));
    if (!anyInventory && parts.length !== 1) return [this.canonical(raw)];
    return this.unique(canon);
  }

  private formatCombo(sails: string[]): string {
    return sails.join(' + ');
  }

  private canonical(name: string): string {
    const hit = (this.draft?.sails ?? []).find(s => s.toLowerCase() === name.toLowerCase());
    return hit ?? name;
  }

  private inInventory(name: string): boolean {
    return (this.draft?.sails ?? []).some(s => s.toLowerCase() === name.toLowerCase());
  }

  private unique(sails: string[]): string[] {
    const seen = new Set<string>();
    const out: string[] = [];
    for (const s of sails) {
      const key = s.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(s);
    }
    return out;
  }

  private stripSail(name: string): void {
    const keep = (s: string) => s.toLowerCase() !== name.toLowerCase();
    const rewrite = (cell: SailPlanCell) => {
      cell.primary = this.formatCombo(this.parseCombo(cell.primary).filter(keep));
      cell.alternatives = this.altSails(cell).filter(keep);
      const avoid = this.parseCombo(cell.avoid).filter(keep);
      cell.avoid = this.formatCombo(avoid) || undefined;
    };
    for (const row of this.draft.cells) {
      for (const cell of row) rewrite(cell);
    }
    for (const cell of this.draft.heavyWeather.cells) rewrite(cell);
  }

  private async refreshDraft(): Promise<void> {
    await this.sailPlans.ensureLoaded();
    this.draft = clonePlan(this.sailPlans.plan);
    this.cdr.markForCheck();
  }

  private async applyTemplateReset(): Promise<void> {
    await this.sailPlans.resetToTemplate();
    this.draft = clonePlan(this.sailPlans.plan);
    this.cdr.markForCheck();
  }

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
