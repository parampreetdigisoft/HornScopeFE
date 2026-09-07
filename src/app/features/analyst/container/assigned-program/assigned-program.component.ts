import { Component, OnDestroy, OnInit } from '@angular/core';
import { PaginationRequest, PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { AnalystService } from '../../analyst.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';

@Component({
  selector: 'app-assigned-program',
  templateUrl: './assigned-program.component.html',
  styleUrl: './assigned-program.component.css',
})
export class AssignedProgramComponent implements OnInit, OnDestroy{
  programsResponse: PaginationResponse<ProgramVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1
  isLoader: boolean = false;  
 constructor(private analystService: AnalystService, private userService:UserService,private toaster: ToasterService) { }
  ngOnDestroy(): void {

  }
  ngOnInit(): void {
    this.getPrograms();
  }

    getPrograms(currentPage: number = 1 ) {  
      this.programsResponse = undefined;
      this.isLoader = true;
      let payload: PaginationUserRequest = {
        sortDirection: SortDirection.DESC,
        sortBy: 'score',
        pageNumber: currentPage,
        pageSize: this.pageSize,
        userId:this.userService?.userInfo?.userID
      }
      this.analystService.getPrograms(payload).subscribe(programs => {
        if (programs?.data) {
          programs.data = [...programs.data].sort((a, b) => Number(b.score ?? 0) - Number(a.score ?? 0));
        }
        this.programsResponse = programs;
        this.totalRecords = programs.totalRecords;
        this.currentPage = currentPage;
        this.pageSize = programs.pageSize;
        this.isLoader = false;
      });
    }

}
