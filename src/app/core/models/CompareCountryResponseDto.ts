export interface CompareCountryResponseDto {
  categories: string[];
  series: ChartSeriesDto[];
  tableData: ChartTableRowDto[];
}

export interface ChartSeriesDto {
  name: string;
  data: number[];
  aiData: number[];
}

export interface ChartTableRowDto {
  layerID: number;
  layerCode: string;
  layerName: string;
  countryValues: CountryValueDto[];
  peerCountryScore: number;
}

export interface CountryValueDto {
  countryID: number;
  countryName: string;
  value: number;
  aiValue: number;
}
