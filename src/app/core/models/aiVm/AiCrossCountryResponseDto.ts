export interface AiCrossCountryResponseDto {
  categories: string[];
  series: ChartSeriesDto[];
  tableData: ChartTableRowDto[];
}
export interface ChartSeriesDto {
  name: string;
  data: number[];
}
export interface PillarValueDto {
  pillarID: number;
  pillarName: string;
  displayOrder: number;
  value: number;
  isAccess: boolean;
  imagePath:string;
}
export interface ChartTableRowDto {
  countryID: number;
  countryName: string;
  updatedAt: string;
  value: number;
  pillarValues: PillarValueDto[];
}

export interface PillarWiseScoreDto {
  pillarID: number;
  pillarName: string;
  displayOrder: number;
  isAccess: boolean;
  imagePath:string;
  values: {
    countryID: number;
    countryName: string;
    value: number;
  }[];
}

