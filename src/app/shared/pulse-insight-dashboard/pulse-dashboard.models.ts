export type PulseKpiTab = 'ambitionDelivery' | 'diplomaticRisk' | 'institutionalReadiness';

export interface PulseSummaryCard {
  title: string;
  value: string | number;
  subtitle: string;
  icon: string;
  accent?: 'blue' | 'green' | 'teal' | 'cyan';
}

export interface PulseMetricCard {
  title: string;
  value: string;
  icon: string;
  accent?: 'blue' | 'green' | 'teal' | 'warn' | 'neutral';
  highlight?: boolean;
}

export interface PulseIndexHero {
  modeName: string;
  programLabel: string;
  overallLabel: string;
  stats: { label: string; value: string }[];
}

export interface PulseKpiCard {
  id: string | number;
  code: string;
  name: string;
  description: string;
  aiScore: number | null;
  manualScore: number | null;
  /** Primary condition shown on KPI card badge (AI when available). */
  condition: string;
  aiCondition: string;
  manualCondition: string;
  /** Primary interpretation shown on KPI card preview (AI when available). */
  interpretation: string;
  aiInterpretation: string;
  manualInterpretation: string;
  narrative?: string;
  aiStrategicAction?: string;
  manualStrategicAction?: string;
  icon: string;
  isAlert?: boolean;
}
