import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToastController } from '@ionic/angular';
import { Subscription } from 'rxjs';
import {
  candidatesForRole,
  INSTRUMENT_ROLE_CONFIG,
  sogCandidates,
  stripSelfPrefix,
} from '../../core/models/instrument-roles';
import { DEFAULT_INSTRUMENT_MAP } from '../../core/models/instrument-map-default';
import { InstrumentBinding, InstrumentMap, InstrumentRole } from '../../core/models/instrument-map.model';
import { DiscoveredPath, InstrumentDiscoveryService } from '../../core/services/instrument-discovery.service';
import { InstrumentMapService } from '../../core/services/instrument-map.service';
import { SignalKConnectionState, SignalKService } from '../../core/services/signal-k.service';

const MPS_TO_KNOTS = 1.94384;
const STALE_AFTER_MS = 60_000;

@Component({
  selector: 'app-instruments',
  templateUrl: './instruments.page.html',
  styleUrls: ['./instruments.page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: false,
})
export class InstrumentsPage implements OnInit, OnDestroy {

  readonly roles = INSTRUMENT_ROLE_CONFIG;

  draft!: InstrumentMap;
  discovered = new Map<string, DiscoveredPath>();
  connectionState: SignalKConnectionState = 'disconnected';
  scanning = false;
  scanProgress = 0;

  private subs: Subscription[] = [];
  private scanSub: Subscription | null = null;
  private scanStartedAt = 0;

  constructor(
    private readonly maps: InstrumentMapService,
    private readonly discovery: InstrumentDiscoveryService,
    private readonly sk: SignalKService,
    private readonly toasts: ToastController,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit(): void {
    this.draft = cloneMap(this.maps.map);
    this.subs.push(
      this.sk.state$.subscribe(state => {
        this.connectionState = state;
        this.cdr.markForCheck();
      }),
    );
    void this.maps.ensureLoaded().then(() => {
      this.draft = cloneMap(this.maps.map);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.scanSub?.unsubscribe();
    this.subs.forEach(s => s.unsubscribe());
  }

  get connected(): boolean {
    return this.connectionState === 'connected';
  }

  startScan(): void {
    if (!this.connected || this.scanning) return;
    this.scanning = true;
    this.scanProgress = 0;
    this.discovered.clear();
    this.scanStartedAt = Date.now();
    this.scanSub?.unsubscribe();
    this.scanSub = this.discovery.scan().subscribe({
      next: map => {
        this.discovered = map;
        const elapsed = Date.now() - this.scanStartedAt;
        this.scanProgress = Math.min(100, Math.round((elapsed / 45_000) * 100));
        this.cdr.markForCheck();
      },
      complete: () => {
        this.scanning = false;
        this.scanProgress = 100;
        this.cdr.markForCheck();
      },
    });
  }

  optionsFor(role: InstrumentRole): string[] {
    const current = this.draft.instruments[role]?.path;
    return candidatesForRole(role, this.discovered, current);
  }

  sogOptions(): string[] {
    const current = this.draft.instruments.speed?.fallback?.path;
    return sogCandidates(this.discovered, current);
  }

  selectedPath(role: InstrumentRole): string {
    return this.draft.instruments[role]?.path ?? '';
  }

  selectedSogFallback(): string {
    return this.draft.instruments.speed?.fallback?.path ?? '';
  }

  setPath(role: InstrumentRole, path: string): void {
    if (!path) {
      delete this.draft.instruments[role];
    } else {
      this.draft.instruments[role] = { path, source: 'owner' };
    }
    this.cdr.markForCheck();
  }

  setSogFallback(path: string): void {
    const speed = this.draft.instruments.speed ?? {
      path: DEFAULT_INSTRUMENT_MAP.instruments.speed!.path,
      source: 'owner',
    };
    if (!path) {
      delete speed.fallback;
    } else {
      speed.fallback = { path, source: 'owner' };
    }
    this.draft.instruments.speed = speed;
    this.cdr.markForCheck();
  }

  liveHint(path: string): string {
    if (!path) return '';
    const hit = this.discovered.get(path);
    if (!hit) return this.needsAttention(path) ? 'Not seen during last scan' : '';
    const rel = stripSelfPrefix(path);
    const ageSec = Math.round((Date.now() - hit.seenAt) / 1000);
    const formatted = this.formatValue(rel, hit.value);
    return `${formatted} · seen ${ageSec}s ago`;
  }

  needsAttention(path: string): boolean {
    if (!path || this.scanning) return false;
    if (this.discovered.size === 0) return false;
    const hit = this.discovered.get(path);
    if (!hit) return true;
    return Date.now() - hit.seenAt > STALE_AFTER_MS;
  }

  async save(): Promise<void> {
    const ok = await this.maps.save(this.draft);
    const toast = await this.toasts.create({
      message: ok ? 'Instrument map saved' : 'Saved locally — server sync failed',
      duration: 2500,
      color: ok ? 'success' : 'warning',
    });
    await toast.present();
    if (ok) this.draft = cloneMap(this.maps.map);
    this.cdr.markForCheck();
  }

  async resetDefaults(): Promise<void> {
    const ok = await this.maps.resetToDefault();
    if (ok) this.draft = cloneMap(this.maps.map);
    this.cdr.markForCheck();
  }

  trackByRole(_: number, cfg: { role: InstrumentRole }): string {
    return cfg.role;
  }

  private formatValue(relativePath: string, value: number): string {
    if (relativePath.includes('depth')) return `${value.toFixed(1)} m`;
    if (relativePath.includes('speed') || relativePath.includes('Speed')) {
      return `${(value * MPS_TO_KNOTS).toFixed(1)} kn`;
    }
    if (relativePath.includes('angle') || relativePath.includes('heading') || relativePath.includes('course')) {
      const deg = Math.abs(value) <= Math.PI + 0.01 ? value * (180 / Math.PI) : value;
      return `${deg.toFixed(0)}°`;
    }
    return value.toFixed(2);
  }
}

function cloneMap(map: InstrumentMap): InstrumentMap {
  const instruments: InstrumentMap['instruments'] = {};
  for (const [role, binding] of Object.entries(map.instruments ?? {})) {
    if (!binding) continue;
    const copy: InstrumentBinding = { path: binding.path, source: binding.source };
    if (binding.fallback) {
      copy.fallback = { ...binding.fallback };
    }
    instruments[role as InstrumentRole] = copy;
  }
  return { version: map.version, instruments };
}
