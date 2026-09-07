import { PaginationRequest } from "./PaginationRequest";

export interface CompareCountryRequestDto extends PaginationRequest{
  countries: number[];
  Kpis?: number[];
  updatedAt?: Date; 
}
