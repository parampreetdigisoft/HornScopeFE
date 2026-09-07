import { AITrustLevelVM } from "./AITrustLevelVM";


export interface AiCountryPillarResponseDto {
  pillars: AiCountryPillarVM[];
}
export interface AiCountryPillarVM {
  pillarScoreID: number;

  countryID: number;
  pillarID: number;

  pillarName: string;
  description?: string | null;
  displayOrder: number;
  imagePath?: string | null;

  isAccess: boolean;

  aiDataYear: number;

  aiScore?: number | null;
  aiProgress?: number | null;
  evaluatorScore?: number | null;
  discrepancy?: number | null;

  confidenceLevel?: string | null;

  evidenceSummary?: string | null;
  structuralEvidence?: string | null;
  operationalEvidence?: string | null;
  outcomeEvidence?: string | null;
  perceptionEvidence?: string | null;
  temporalScope?: string | null;
  distortionScreening?: string | null;
  relationalIntegrity?: string | null;

  stressPoliticalShock?: string | null;
  stressEconomicShock?: string | null;
  stressNarrativeShock?: string | null;
  stressOverallResilience?: string | null;
  stressScoreAdjustment?: string | null;

  inequalityAdjustment?: string | null;
  opacityRisk?: string | null;
  nonCompensationNote?: string | null;
  geographicEquityNote?: string | null;
  institutionalAssessment?: string | null;
  dataGapAnalysis?: string | null;

  redFlag?: string | null;

  aiCompletionRate?: number | null;

  updatedAt?: Date | null;

  dataSourceCitations?: AIDataSourceCitation[] | null;
}

export interface AIDataSourceCitation {
  citationID: number;
  pillarScoreID?: number | null;
  sourceType: string;
  sourceName: string;
  sourceURL: string;
  dataYear?: number | null;
  dataExtract?: string | null;
  trustLevel?: number | null;
  createdAt?: string | null; // ISO string from API
}

