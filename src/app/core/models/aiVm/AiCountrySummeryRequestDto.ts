import { PaginationRequest } from "../PaginationRequest";

export interface AiCountrySummeryRequestDto extends PaginationRequest {
  countryID?:number;
  year?:number
}

export interface AiPillarQuetionsRequestDto extends AiCountrySummeryRequestDto {
  pillarID?:number;
}

export interface AiCountryDocumentRequestDto extends PaginationRequest {
  countryID?:number;
}

export interface AiCountryPillarDocumentRequestDto {
  countryID: number;
}

export interface DeleteCountryDocumentRequestDto {
  countryID: number;
  countryDocumentID?: number;
  isAll?: boolean;
}