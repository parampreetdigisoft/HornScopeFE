import { AssessmentPhase } from "../enums/AssessmentPhase";

export interface ProgramVM extends AddUpdateProgramDto {
    isActive: boolean;
    createdDate: string;   // ISO date string from backend
    updatedAt?: string | null;
    isDeleted: boolean;
    assignedBy?: string;
    image?: string;
    staffProgramMappingID?:number;
    score?: number;
    progress?: number;
    aiScore?: number; 
    selected:boolean;
    assessmentPhase:AssessmentPhase;
    aiCompletionRate?: number; 
}

export interface AddUpdateProgramDto {
  climateProgramID: number;
  year: number;
  description: string;
  status: string;
  programName: string;
  location: string;
  imageFile: string;
  imageUrl: string;
  startAt: Date;
  endAt: Date;
  peerProgramIDs?: number[]; 
}

export interface BulkAddProgramDto {
  programs : ProgramVM[]
}