export interface AiCountrySummeryDto {
  countryID: number;
  continent: string;
  countryName: string;
  image: string | null;
  year: number;
  aiScore: number | null;
  aiProgress: number | null;
  evaluatorScore: number | null;
  discrepancy: number | null;

  immediateSituationSummary: string;
  evidenceSummary: string;
  countryScoreSummery: string;

  confidenceLevel: string;
  structuralEvidence: string | null;
  operationalEvidence: string | null;
  outcomeEvidence: string | null;
  perceptionEvidence: string | null;

  reliabilityAssessment: string | null;
  temporalReliability: string | null;

  geopoliticalShock: string | null;
  economicShock: string | null;
  financeShock: string | null;

  dataIntegrityIndex: string | null;
  dataOpacityRisk: string | null;
  scenarioAnalysis: string | null;

  crossPillarPatterns: string | null;
  relationalIntegrity: string | null;
  earlyWarningAssessment: string | null;

  strategicRecommendation: string | null;
  dataTransparencyNote: string | null;
  primarySource: string | null;

  keyDevelopments: string | null;
  criticalRisks: string | null;
  gaps: string | null;
  keyFindings: string | null;
  recommendations: string | null;

  updatedAt: Date;
  isVerified: boolean;

  aiCompletionRate?: number;
  rank?: number;
  regionRank?: number;
}
