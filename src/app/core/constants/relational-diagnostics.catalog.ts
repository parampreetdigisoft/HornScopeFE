export type DiagnosticsDashboardTab = 'relational' | 'composite';

export interface RelationalDiagnosticRecord {
  code: string;
  family: string;
  name: string;
  measures: string;
  formula: string;
  riskIndicator: string;
  layerId?: number;
  icon: string;
}

export interface DiagnosticFamily {
  id: string;
  code: string;
  pillar: string;
  shortLabel: string;
  focus: string;
  icon: string;
  diagnostics: RelationalDiagnosticRecord[];
}

export interface CompositeDiagnosticIndex {
  code: string;
  name: string;
  formula: string;
  meaning: string;
  layerId?: number;
  icon: string;
}

export const DIAGNOSTIC_FAMILIES: DiagnosticFamily[] = [
  {
    id: 'A',
    code: 'A',
    pillar: 'Geopolitics and Foreign Relations',
    shortLabel: 'Geopolitics',
    focus: 'External pressure, influence, autonomy, borders, and diaspora.',
    icon: 'bi-globe-americas',
    diagnostics: [],
  },
  {
    id: 'B',
    code: 'B',
    pillar: 'Peace, Conflict, and Security',
    shortLabel: 'Peace & Security',
    focus: 'Security capacity, monopoly of force, and conflict containment.',
    icon: 'bi-shield',
    diagnostics: [],
  },
  {
    id: 'C',
    code: 'C',
    pillar: 'Governance, Politics, and Rule of Law',
    shortLabel: 'Governance',
    focus: 'Institutional legitimacy, accountability, and political order.',
    icon: 'bi-bank',
    diagnostics: [],
  },
  {
    id: 'D',
    code: 'D',
    pillar: 'Macroeconomy and Public Finance',
    shortLabel: 'Macroeconomy',
    focus: 'Fiscal space, growth, and macroeconomic buffers.',
    icon: 'bi-graph-up-arrow',
    diagnostics: [],
  },
  {
    id: 'E',
    code: 'E',
    pillar: 'Trade, Infrastructure, and Connectivity',
    shortLabel: 'Trade & Infrastructure',
    focus: 'Ports, corridors, energy, and regional integration.',
    icon: 'bi-truck',
    diagnostics: [],
  },
  {
    id: 'F',
    code: 'F',
    pillar: 'Society, Demography, and Human Development',
    shortLabel: 'Society',
    focus: 'Human capital, cohesion, and demographic pressure.',
    icon: 'bi-heart-pulse',
    diagnostics: [],
  },
  {
    id: 'G',
    code: 'G',
    pillar: 'Climate, Environment, and Natural Resources',
    shortLabel: 'Climate & Resources',
    focus: 'Climate stress, water, land, and extractives.',
    icon: 'bi-cloud-sun',
    diagnostics: [],
  },
  {
    id: 'H',
    code: 'H',
    pillar: 'Technology, Innovation, and Cyber',
    shortLabel: 'Technology',
    focus: 'Digital capacity, cyber risk, and innovation ecosystems.',
    icon: 'bi-cpu',
    diagnostics: [],
  },
  {
    id: 'I',
    code: 'I',
    pillar: 'Strategic Narratives, Media, and Information',
    shortLabel: 'Narratives',
    focus: 'Information space, disinformation, and public trust.',
    icon: 'bi-broadcast',
    diagnostics: [],
  },
  {
    id: 'J',
    code: 'J',
    pillar: 'Humanitarian Affairs and Resilience',
    shortLabel: 'Humanitarian',
    focus: 'Displacement, protection, and shock absorption.',
    icon: 'bi-life-preserver',
    diagnostics: [],
  },
  {
    id: 'K',
    code: 'K',
    pillar: 'Strategic Outlook and Forecasting',
    shortLabel: 'Strategic Outlook',
    focus: 'Foresight, contingency, and institutional learning.',
    icon: 'bi-binoculars',
    diagnostics: [],
  },
];
