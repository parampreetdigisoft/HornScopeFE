export interface CompareProgramResponseDto {
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
  programValues: ProgramValueDto[];
  peerProgramScore: number;
}

export interface ProgramValueDto {
  climateProgramID: number;
  programName: string;
  value: number;
  aiValue: number;
}
