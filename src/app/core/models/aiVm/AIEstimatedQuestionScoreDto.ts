export interface AIEstimatedQuestionScoreDto {
  countryID: number;
  pillarID: number;
  questionID: number;
  questionText: string;
  year: number; // ✅ renamed from dataYear
  aiScore: number | null;
  aiProgress: number | null;
  evaluatorScore: number | null; // ✅ renamed
  discrepancy: number | null;
  confidenceLevel: string | null;
  sourcesConsulted: number | null; // ✅ renamed
  evidenceSummary: string | null;
  // Evidence Dimensions
  structuralEvidence: string | null;
  operationalEvidence: string | null;
  outcomeEvidence: string | null;
  perceptionEvidence: string | null;
  temporalScope: string | null;
  distortionScreening: string | null;
  relationalDependencies: string | null;
  // Stress Tests
  stressPoliticalShock: string | null;
  stressEconomicShock: string | null;
  stressNarrativeShock: string | null;
  stressOverallResilienceShock: string | null;
  inequalityAdjustment: string | null; // ✅ renamed
  opacityRisk: string | null;
  redFlag: string | null; // ✅ renamed
  // Source Metadata
  sourceType: string | null;
  sourceName: string | null;
  sourceURL: string | null;
  sourceDataYear: number | null;
  sourceDataExtract: string | null;
  sourceHierarchyLevel: number | null; // ✅ renamed
  updatedAt: Date | null;
}
