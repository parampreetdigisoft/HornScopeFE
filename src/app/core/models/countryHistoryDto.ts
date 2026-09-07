import { GetCountrySubmitionHistoryResponseDto } from "src/app/core/models/AssessmentResponse";

export interface CountryHistoryDto {
  totalCountry: number;
  totalAnalyst: number;
  totalEvaluator: number;
  activeCountry: number;
  totalAccessCountry: number;
  compeleteCountry: number;
  inprocessCountry: number;
  avgHighScore: number;
  avgLowerScore: number;
  overallVitalityScore: number;
  finalizeCountry: number;
  unFinalize: number;
}

export interface GetCountryQuestionHistoryResponseDto
  extends GetCountrySubmitionHistoryResponseDto {
  pillars: CountryPillarQuestionHistoryResponseDto[];
}

export interface CountryPillarQuestionHistoryResponseDto {
  pillarID: number;
  pillarName: string;
  score: number;
  scoreProgress: number;
  ansPillar: number;
  totalQuestion: number;
  ansQuestion: number;
  imagePath: string;
  isAccess: boolean;
}

export interface GetCountriesSubmitionHistoryResponseDto
  extends GetCountrySubmitionHistoryResponseDto {
  countryName: string;
}
export interface CountryPillarHistoryResponseDto
  extends CountryPillarQuestionHistoryResponseDto {
  userID: number;
  fullName: string;
}

export interface UserCountryRequestDto extends UserCountryPillarDashboardRequestDto {
  userID: number;
}

export interface UserCountryPillarDashboardRequestDto {
  countryID: number;
  updatedAt: string;
}
