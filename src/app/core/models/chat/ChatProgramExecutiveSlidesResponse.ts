export interface PerformanceSummary {
  trend: string;
  summary: string;
}

export interface CombinedRiskItem {
  rank: number;
  title: string;
  riskScore: number;
  severity: string;
  trend: string;
  description: string;
  recommendation: string;
}

export interface EarlyWarningItem {
  title: string;
  description: string;
  timeframe: string;
  impactLevel: string;
}

export interface ProgramExecutiveSlidesResult {
  program: ProgramRankingResponseDto;
  recentPerformance: PerformanceSummary;
  combinedRisks: CombinedRiskItem[];
  earlyWarnings: EarlyWarningItem[];
}

export interface ChatProgramExecutiveSlidesResponse {
  success: boolean;
  message: string;
  result: ProgramExecutiveSlidesResult;
}

export interface ProgramRankingResponseDto {
  climateProgramID: number;
  programName: string;
  location: string;
  totalProgram: number;
  programRank: number;
  totalProgramInRegion: number;
  regionRank: number;
  programAIScore: number;
  dataYear?: number;
  pillars: PillarsUserHistroyResponseDto[];
}

export interface PillarsUserHistroyResponseDto {
  pillarID: number;
  pillarName: string;
  imagePath: string;
  pillarScore: number;
  displayOrder: number;
}