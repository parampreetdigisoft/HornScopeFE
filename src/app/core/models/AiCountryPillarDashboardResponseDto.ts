export interface AiCountryPillarDashboardResponseDto {
  countryID: number;
  countryName: string;
  evaluationValue: number;
  aiValue: number;
  pillars: CountryPillarDashboardPillarValueDto[];
}

export interface CountryPillarDashboardPillarValueDto {
  pillarID: number;
  pillarName: string;
  displayOrder: number;
  evaluationValue: number;
  aiValue: number;
}
