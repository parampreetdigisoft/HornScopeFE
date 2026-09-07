import { UserRoleValue } from "src/app/core/enums/UserRole";
import { PaginationRequest } from "src/app/core/models/PaginationRequest";
import { PublicUserResponse } from "src/app/core/models/UserInfo";
import { AddUpdateCountryDto } from "./CountryVM";

export interface GetUserByRoleResponse  extends PublicUserResponse {
  countries: AddUpdateCountryDto[];
}


export interface GetUserByRoleRequestDto extends PaginationRequest{
  userID: number;
  getUserRole?:UserRoleValue;
}