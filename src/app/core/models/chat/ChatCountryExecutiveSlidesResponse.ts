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

export interface CountryExecutiveSlidesResult {
  country: CountryRankingResponseDto;

  recentPerformance: PerformanceSummary;

  combinedRisks: CombinedRiskItem[];

  earlyWarnings: EarlyWarningItem[];
}

export interface ChatCountryExecutiveSlidesResponse {
  success: boolean;
  message: string;
  result: CountryExecutiveSlidesResult;
}

export interface CountryRankingResponseDto {
  countryID: number;
  countryName: string;
  region: string;
  continent: string;
  totalCountry: number;
  countryRank: number;
  totalCountryInRegion: number;
  regionRank: number;
  countryAIScore: number;
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