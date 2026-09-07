import { Component, OnDestroy, OnInit } from '@angular/core';
import { PaginationRequest, PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { AnalystService } from '../../analyst.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';

@Component({
  selector: 'app-assigned-country',
  templateUrl: './assigned-country.component.html',
  styleUrl: './assigned-country.component.css',  
})
export class AssignedCountryComponent implements OnInit, OnDestroy{
  countriesResponse: PaginationResponse<CountryVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1
  isLoader: boolean = true;  
 constructor(private analystService: AnalystService, private userService:UserService,private toaster: ToasterService) { }
  ngOnDestroy(): void {

  }
  ngOnInit(): void {
    this.getCountries();
  }


    getCountries(currentPage: number = 1 ) {  
      this.countriesResponse = undefined;
      this.isLoader = true;
      let payload: PaginationUserRequest = {
        sortDirection: SortDirection.DESC,
        sortBy: 'score',
        pageNumber: currentPage,
        pageSize: this.pageSize,
        userId:this.userService?.userInfo?.userID
      }
      this.analystService.getCountries(payload).subscribe(countries => {
        this.countriesResponse = countries;
        this.totalRecords = countries.totalRecords;
        this.currentPage = currentPage;
        this.pageSize = countries.pageSize;
        this.isLoader = false;
      });
    }

}
