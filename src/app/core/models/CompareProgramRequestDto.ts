import { PaginationRequest } from "./PaginationRequest";

export interface CompareProgramRequestDto extends PaginationRequest{
  programs: number[];
  Kpis?: number[];
  updatedAt?: Date; 
}
