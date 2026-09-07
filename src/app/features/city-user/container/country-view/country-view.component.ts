import { Component, OnDestroy, OnInit } from '@angular/core';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { CountryVM } from '../../../../core/models/CountryVM';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { environment } from 'src/environments/environment';
import { CountryUserService } from '../../country-user.service';
import { Router } from '@angular/router';
import { UserDataShareService } from '../../user-data-share.service';
import { TieredAccessPlanValue } from 'src/app/core/enums/TieredAccessPlan';
declare var bootstrap: any;
@Component({
  selector: 'app-country-view',
  templateUrl: './country-view.component.html',
  styleUrl: './country-view.component.css'
})
export class CountryViewComponent {
  urlBase = environment.apiUrl;  
  countriesResponse: PaginationResponse<CountryVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  loading: boolean = false;
  isLoader: boolean = true;
  isOpendialog = false;
  selectedCountries: CountryVM[] = [];
  countries: CountryVM[] = [];
  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;
  constructor(private countryUserService: CountryUserService, private toaster: ToasterService,
    private userService: UserService, private router: Router, private userDataService: UserDataShareService) {
    this.tier = this.userService?.userInfo?.tier || 0;
  }

  ngOnInit(): void {
    this.getCountries(1);
  }

  getCountries(currentPage: any = 1) {
    this.countriesResponse = undefined;
    this.isLoader = true;
    let payload: PaginationUserRequest = {
      sortDirection: SortDirection.DESC,
      sortBy: 'score',
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID
    }

    this.countryUserService.getCountries(payload).subscribe(countries => {
      this.countriesResponse = countries;
      this.totalRecords = countries.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = countries.pageSize;
      this.isLoader = false;
    });

  }

  ngOnDestroy(): void {

  }

  viewDetails(country: CountryVM) {
    this.userDataService.country.set(country);
    this.router.navigate(['countryuser/country-details']);
  }


  countrySelected(event: any, country: CountryVM) {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Add country if not already in list
      const exists = this.selectedCountries.some(c => c.countryID === country.countryID);
      if (!exists) {
        this.selectedCountries.push(country);
      }
    } else {
      // Remove city if unchecked
      this.selectedCountries = this.selectedCountries.filter(c => c.countryID !== country.countryID);
    }
  }

  isCountrySelected(country: CountryVM): boolean {
    return this.selectedCountries.some(x => x.countryID === country.countryID);
  }
  gotoComparision() {
    this.userDataService.compareCountry.set(this.selectedCountries);
    this.router.navigate(['/countryuser/comparision']);
  }

}
