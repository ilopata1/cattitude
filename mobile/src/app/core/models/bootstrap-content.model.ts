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
  source_file?: string | null;
  page_start?: number | null;
  page_end?: number | null;
  snippet: string;
  score?: number | null;
}
