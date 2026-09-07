import { AssessmentPhase } from "../enums/AssessmentPhase";

export interface CountryVM extends AddUpdateCountryDto {
  isActive: boolean;
  createdDate: string;   // ISO date string from backend
  updatedDate?: string | null;
  isDeleted: boolean;
  assignedBy?: string;
  image?: string;
  userCountryMappingID?:number;
  score?: number;
  progress?: number;
  aiScore?: number; 
  selected:boolean;
  assessmentPhase:AssessmentPhase;
  aiCompletionRate?: number; 
}
export interface AddUpdateCountryDto {
  countryID: number;
  countryName: string;
  continent: string;  
  countryCode: string;
  region: string;
  imageFile: string;
  imageUrl: string;
  longitude: number;
  latitude: number;
  population:number;
  income:number;
  countryAliasName :string; 
  peerCountryIDs?: number[]; 
  developmentCategory?:string  
}

export interface BulkAddCountryDto {
  countries : CountryVM[]
}