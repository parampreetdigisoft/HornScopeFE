import { AIDataSourceCitation } from './AiCountryPillarResponseDto';

export interface UpdateAICountryScoreDto {
  countryID: number;
  year: number;
  confidenceLevel?: string | null;
  immediateSituationSummary?: string | null;
  evidenceSummary?: string | null;
  keyDevelopments?: string | null;
  criticalRisks?: string | null;
  gaps?: string | null;
  keyFindings?: string | null;
  recommendations?: string | null;
  structuralEvidence?: string | null;
  operationalEvidence?: string | null;
  outcomeEvidence?: string | null;
  perceptionEvidence?: string | null;
  temporalScope?: string | null;
  distortionScreening?: string | null;
  politicalShock?: string | null;
  economicShock?: string | null;
  narrativeShock?: string | null;
  stressScoreAdjustment?: string | null;
  inequalityAdjustment?: string | null;
  opacityRisk?: string | null;
  nonCompensationNote?: string | null;
  relationalIntegrity?: string | null;
  institutionalCapacity?: string | null;
  primarySource?: string | null;
  crossPillarPatterns?: string | null;
  equityAssessment?: string | null;
  conflictRiskOutlook?: string | null;
  strategicRecommendation?: string | null;
  dataTransparencyNote?: string | null;
}

export interface UpdateAIPillarScoreDto {
  pillarScoreID: number;
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
  stressScoreAdjustment?: string | null;
  inequalityAdjustment?: string | null;
  opacityRisk?: string | null;
  nonCompensationNote?: string | null;
  geographicEquityNote?: string | null;
  institutionalAssessment?: string | null;
  dataGapAnalysis?: string | null;
  redFlag?: string | null;
  dataSourceCitations?: UpdateAIDataSourceCitationDto[] | null;
}

export interface UpdateAIDataSourceCitationDto {
  citationID: number;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceURL?: string | null;
  dataYear?: number | null;
  dataExtract?: string | null;
  trustLevel?: number | null;
}

export interface UpdateAIEstimatedQuestionScoreDto {
  countryID: number;
  pillarID: number;
  questionID: number;
  year: number;
  aiScore?: number | null;
  confidenceLevel?: string | null;
  sourcesConsulted?: number | null;
  evidenceSummary?: string | null;
  structuralEvidence?: string | null;
  operationalEvidence?: string | null;
  outcomeEvidence?: string | null;
  perceptionEvidence?: string | null;
  temporalScope?: string | null;
  distortionScreening?: string | null;
  relationalDependencies?: string | null;
  stressPoliticalShock?: string | null;
  stressEconomicShock?: string | null;
  stressNarrativeShock?: string | null;
  inequalityAdjustment?: string | null;
  opacityRisk?: string | null;
  redFlag?: string | null;
  sourceType?: string | null;
  sourceName?: string | null;
  sourceURL?: string | null;
  sourceDataYear?: number | null;
  sourceHierarchyLevel?: number | null;
  sourceDataExtract?: string | null;
}

export type AiFieldType = 'text' | 'textarea' | 'number' | 'confidence' | 'trust' | 'score';

export interface AiEditableFieldConfig {
  key: string;
  label: string;
  type: AiFieldType;
  showInTable?: boolean;
  section?: 'scores' | 'summary' | 'evidence' | 'source';
}

export const CONFIDENCE_LEVEL_OPTIONS = ['Low', 'Medium', 'High'];

export function mapCitationsForUpdate(citations?: AIDataSourceCitation[] | null): UpdateAIDataSourceCitationDto[] {
  return (citations ?? []).map(c => ({
    citationID: c.citationID,
    sourceType: c.sourceType,
    sourceName: c.sourceName,
    sourceURL: c.sourceURL,
    dataYear: c.dataYear,
    dataExtract: c.dataExtract,
    trustLevel: c.trustLevel
  }));
}
