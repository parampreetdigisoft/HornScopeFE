import { UserRoleValue } from "src/app/core/enums/UserRole";
import { PaginationRequest } from "src/app/core/models/PaginationRequest";
import { PublicUserResponse } from "src/app/core/models/UserInfo";
import { AddUpdateProgramDto } from "./ProgramVM";

export interface GetUserByRoleResponse  extends PublicUserResponse {
  climatePrograms: AddUpdateProgramDto[];
}


export interface GetUserByRoleRequestDto extends PaginationRequest{
  userID: number;
  getUserRole?:UserRoleValue;
}