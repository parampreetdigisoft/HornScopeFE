import {  TieredAccessPlanValue } from "src/app/core/enums/TieredAccessPlan";

export interface StaffProgramGetPillarInfoRequestDto {
    userID?: number;
    climateProgramID: number;
    pillarID: number;
    updatedAt?: string;
    Tiered?:TieredAccessPlanValue
}