import { VesselType } from './schema-enums';

export interface BootstrapBranding {
  vesselName: string;
  vesselSlug: string;
  vesselType: VesselType;
  model: string;
  charterCompany: string;
  location: string;
  marina: string;
  tagline: string;
  headerLogo: string | null;
  heroLogo: string | null;
}

export interface EmergencyContact {
  label: string;
  detail?: string;
  value: string;
  tel?: string;
  action: 'call' | 'vhf';
}

export interface BootstrapEmergency {
  mayday: {
    channel: string;
    vesselCallsign: string;
    steps: string[];
  };
  contacts: EmergencyContact[];
  modalSubtitle: string;
}

export interface SystemSection {
  t: string;
  type: string;
  c?: string;
  html?: string;
  items?: unknown[];
  /** Registry places for devices referenced in this system chapter. */
  rows?: Array<{ name: string; location: string }>;
  [key: string]: unknown;
}

export interface SystemModule {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  locs?: string[];
  summary?: string;
  learnChecks?: string[];
  /** Phase 1b — structured cross-section links (also embedded in section.html). */
  guideLinks?: Array<{
    target_kind?: string;
    target_id?: string;
    label?: string;
    data_guide_link?: string;
  }>;
  sections: SystemSection[];
}

export interface ChecklistItem {
  c: string;
  s?: string;
}

export interface ChecklistGroup {
  t: string;
  items: ChecklistItem[];
}

export interface Checklist {
  title?: string;
  sub?: string;
  groups: ChecklistGroup[];
}

export interface LocationZone {
  label: string;
  sys: string[];
}

export interface FixCard {
  icon: string;
  cat: string;
  catL: string;
  title: string;
  steps: string[];
}

export type RuleTone = 'danger' | 'caution' | 'good';

export interface HomeRule {
  icon: string;
  text: string;
  tone: RuleTone;
  link?: string;
}

export interface HomeRuleSection {
  title: string;
  tone: RuleTone;
  rules: HomeRule[];
}

export interface DoMenuItem {
  key: string;
  title: string;
  subtitle: string;
  icon: string;
  iconClass: string;
  route: string;
  progressType: 'checklist' | 'learn';
}

export interface DoMenuSection {
  label: string;
  items: DoMenuItem[];
}

export interface ChecklistMeta {
  title: string;
  subtitle: string;
  icon: string;
}

export interface LocationLayoutItem {
  id: string;
  label: string;
  class?: string;
  rowClass?: string;
}

export interface BootstrapUi {
  homeRuleSections: HomeRuleSection[];
  doMenu: DoMenuSection[];
  checklistMeta: Record<string, ChecklistMeta>;
  systemOrder: string[];
  locationLayout: LocationLayoutItem[];
}

export interface BootstrapContent {
  vesselId: string | null;
  vesselSlug: string;
  branding: BootstrapBranding;
  emergency: BootstrapEmergency;
  systems: Record<string, SystemModule>;
  checklists: Record<string, Checklist>;
  fixes: FixCard[];
  locations: Record<string, LocationZone>;
  manualTitles: Record<string, string>;
  ui: BootstrapUi;
}

export interface VesselContext {
  vesselId: string | null;
  vesselSlug: string;
  charterCompanyId: string | null;
  charterId: string | null;
  guestToken: string | null;
}

export interface ChatMessage {
  role: 'user' | 'assistant';
  content: string;
  sources?: ChatSource[];
}

export interface ChatSource {
  node_id?: string | null;
  manual_id: string;
  title?: string | null;
  source_file?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  snippet: string;
  score?: number | null;
}

/** One page (or page-range) link inside a grouped document chip. */
export interface ChatSourcePageRef {
  source: ChatSource;
  sourceIndex: number;
  pageLabel: string | null;
}

/** Same-document sources collapsed for Ask citation chips. */
export interface ChatSourceGroup {
  key: string;
  title: string;
  pages: ChatSourcePageRef[];
  untitledSources: ChatSourcePageRef[];
}
