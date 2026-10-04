import { VesselType } from './schema-enums';
import { SailPlan } from './sail-plan.model';

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
  /** Only ``crew`` is published. Omitted contacts show in both views. */
  audience?: 'crew';
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
  /** Only ``crew`` is published. Hidden in the Guest reading view; omitted sections show in both. */
  audience?: 'guest' | 'crew';
  [key: string]: unknown;
}

export interface LearnCheck {
  key: string;
  text: string;
}

export interface SystemModule {
  id: string;
  icon: string;
  title: string;
  subtitle: string;
  locs?: string[];
  summary?: string;
  learnChecks?: Array<string | LearnCheck>;
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
  /** Guest-voice line. The Guest view shows this instead of ``c`` when set. */
  gc?: string;
  /** Only ``crew`` is published. Omitted items show in both views. */
  audience?: 'crew';
}

export interface ChecklistGroup {
  t: string;
  items: ChecklistItem[];
}

export interface Checklist {
  title?: string;
  sub?: string;
  /** Only ``crew`` is published. Omitted checklists show in both views. */
  audience?: 'crew';
  groups: ChecklistGroup[];
}

export interface LocationZone {
  label: string;
  sys?: string[];
  items?: Array<{
    name: string;
    location: string;
    zone: string | null;
    systemId: string;
    sectionIndex: number;
  }>;
}

export interface FixCard {
  icon: string;
  cat: string;
  catL: string;
  title: string;
  steps: string[];
  /** Guest-safe steps. The Guest view shows these instead of ``steps``. */
  guestSteps?: string[];
  /** Only ``crew`` is published. Omitted cards show in both views. */
  audience?: 'crew';
}

export type RuleTone = 'danger' | 'caution' | 'good';

export interface HomeRule {
  icon: string;
  text: string;
  tone: RuleTone;
  link?: string;
  /** Only ``crew`` is published. Omitted rules show in both views. */
  audience?: 'crew';
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

export interface LearnPathLesson {
  id: string;
  kind: 'chapter' | 'power' | 'checklist';
}

export interface LearnPathStage {
  id: string;
  title: string;
  lessons: LearnPathLesson[];
}

export interface BootstrapUi {
  homeRuleSections: HomeRuleSection[];
  doMenu: DoMenuSection[];
  checklistMeta: Record<string, ChecklistMeta>;
  systemOrder: string[];
  locationLayout: LocationLayoutItem[];
  /** Present after the next publish. Older bundles derive the same stages in the app. */
  learnPath?: LearnPathStage[];
  /** Present after the next publish. Older bundles derive the same index from equipment rows. */
  whereIndex?: {
    items: Array<{
      name: string;
      location: string;
      zone: string | null;
      systemId: string;
      sectionIndex: number;
    }>;
    zones: Array<{ id: string; label: string }>;
  };
  /**
   * Present after the next publish. Older bundles derive the same chips
   * from system chapters.
   */
  askSuggestions?: string[];
  /**
   * Sail-plan reset target published with this vessel. Absent until a plan
   * has been saved and the guide published again.
   */
  sailPlanTemplate?: SailPlan;
}

export interface BootstrapContent {
  /**
   * Published contract generation. Absent on guides assembled before the field
   * existed; those are schema 1. See bootstrap-schema.ts.
   */
  schemaVersion?: number;
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
