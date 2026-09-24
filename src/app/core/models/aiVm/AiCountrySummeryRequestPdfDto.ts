export interface AiCountrySummeryRequestPdfDto {
  countryID: number;
  year: number;
  pillarID?: number;
  pillarIDs?: number[];
  format?:string;
   reportType?:string;
}