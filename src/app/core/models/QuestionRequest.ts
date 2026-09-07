
export interface CountryPillerRequestDto {
  countryID :number;
  userID: number;
  pillarID?: number;
}


export interface CountryMappingPillerRequestDto {
  userCountryMappingID: number;
  pillarID?: number;
}