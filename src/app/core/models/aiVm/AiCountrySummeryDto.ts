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

  temporalScope: string | null;
  distortionScreening: string | null;

  politicalShock: string | null;
  economicShock: string | null;
  narrativeShock: string | null;

  overallStressResilience: string | null;
  stressScoreAdjustment: string | null;
  inequalityAdjustment: string | null;
  opacityRisk: string | null;
  nonCompensationNote: string | null;

  crossPillarPatterns: string | null;
  relationalIntegrity: string | null;
  institutionalCapacity: string | null;
  equityAssessment: string | null;
  conflictRiskOutlook: string | null;

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