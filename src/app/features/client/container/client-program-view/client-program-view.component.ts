import { Component, OnDestroy, OnInit } from '@angular/core';
import { PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { ProgramVM } from '../../../../core/models/ProgramVM';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { environment } from 'src/environments/environment';
import { ClientService } from '../../client.service';
import { Router } from '@angular/router';
import { UserDataShareService } from '../../user-data-share.service';
import { TieredAccessPlanValue } from 'src/app/core/enums/TieredAccessPlan';
declare var bootstrap: any;
@Component({
  selector: 'app-client-program-view',
  templateUrl: './client-program-view.component.html',
  styleUrl: './client-program-view.component.css'
})
export class ClientProgramViewComponent {
  urlBase = environment.apiUrl;  
  programsResponse: PaginationResponse<ProgramVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  loading: boolean = false;
  isLoader: boolean = false;
  isOpendialog = false;
  selectedPrograms: ProgramVM[] = [];
  programs: ProgramVM[] = [];
  tier: TieredAccessPlanValue = TieredAccessPlanValue.Pending;
  constructor(private clientService: ClientService, private toaster: ToasterService,
    private userService: UserService, private router: Router, private userDataService: UserDataShareService) {
    this.tier = this.userService?.userInfo?.tier || 0;
  }

  ngOnInit(): void {
    this.getPrograms(1);
  }

  getPrograms(currentPage: any = 1) {
    this.programsResponse = undefined;
    this.isLoader = true;
    let payload: PaginationUserRequest = {
      sortDirection: SortDirection.DESC,
      sortBy: 'score',
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID
    }

    this.clientService.getPrograms(payload).subscribe(programs => {
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

  ngOnDestroy(): void {

  }

  viewDetails(program: ProgramVM) {
    this.userDataService.program.set(program);
    this.router.navigate(['programuser/program-details']);
  }


  programSelected(event: any, program: ProgramVM) {
    const isChecked = event.target.checked;

    if (isChecked) {
      // Add program if not already in list
      const exists = this.selectedPrograms.some(c => c.climateProgramID === program.climateProgramID);
      if (!exists) {
        this.selectedPrograms.push(program);
      }
    } else {
      // Remove program if unchecked
      this.selectedPrograms = this.selectedPrograms.filter(c => c.climateProgramID !== program.climateProgramID);
    }
  }

  isProgramSelected(program: ProgramVM): boolean {
    return this.selectedPrograms.some(x => x.climateProgramID === program.climateProgramID);
  }
  gotoComparision() {
    this.userDataService.compareProgram.set(this.selectedPrograms);
    this.router.navigate(['programuser/comparison']);
  }

}
