import {  TieredAccessPlanValue } from "src/app/core/enums/TieredAccessPlan";

export interface UserCountryGetPillarInfoRequestDto {
    userID?: number;
    countryID: number;
    pillarID: number;
    updatedAt?: string;
    Tiered?:TieredAccessPlanValue
}