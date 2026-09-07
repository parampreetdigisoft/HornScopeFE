import { Component, OnInit } from "@angular/core";
import { ProgramVM } from "src/app/core/models/ProgramVM";
import { PaginationResponse } from "src/app/core/models/PaginationResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { ActivatedRoute, Router } from "@angular/router";
import { GetAssessmentResponse } from "src/app/core/models/AssessmentResponse";
import {
  ChangeAssessmentStatusRequestDto,
  GetAssessmentRequestDto,
  TransferAssessmentRequestDto,
} from "src/app/core/models/AssessmentRequest";
import { SortDirection } from "src/app/core/enums/SortDirection";
import { PublicUserResponse } from "src/app/core/models/UserInfo";
import { UserRoleValue } from "src/app/core/enums/UserRole";
import { AdminService } from "../../admin.service";
import { AssessmentPhase } from "src/app/core/enums/AssessmentPhase";
import { CommonService } from "src/app/core/services/common.service";
declare var bootstrap: any;
@Component({
  selector: "app-assesment",
  templateUrl: "./assesment.component.html",
  styleUrl: "./assesment.component.css",
})
export class AssesmentComponent implements OnInit {
  isLoader: boolean = false;
  isOpendialog = false;
  selectedclimateProgramID: number | any = "";
  selectedRoleID: UserRoleValue | any = "";
  selectedAssessment: GetAssessmentResponse | any = "";
  changeAssessment: ChangeAssessmentStatusRequestDto | any = "";
  assessmentsResponse: PaginationResponse<GetAssessmentResponse> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  programs: ProgramVM[] | null = [];
  filterProgram!: number;
  loading: boolean = false;
  evaluators: PublicUserResponse[] | null = [];
  userofSelectedProgramResponse: GetAssessmentResponse[] = [];

  rolesList = [
    { name: "Analyst", role: UserRoleValue.Analyst },
    { name: "Evaluator", role: UserRoleValue.Evaluator },
  ];

  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private toaster: ToasterService,
    private router: Router,
    private route: ActivatedRoute,
    public commonService: CommonService
  ) {}

  ngOnInit(): void {
    this.getAllProgramsByUserId();
    this.route.paramMap.subscribe((params) => {
      let rid = params.get("roleID");
      let cid = params.get("climateProgramID");
      if (rid && cid) {
        this.selectedRoleID = rid;
        this.selectedclimateProgramID = cid;
      }
    });
    this.route.queryParams.subscribe((params) => {
      if (params["climateProgramID"]) {
        this.filterProgram = +params["climateProgramID"];
      }
    });
    this.getAssessments();
  }

  goToAssessment(assessment: GetAssessmentResponse) {
    this.router.navigate([
      "/admin/assessment-result",
      assessment.assessmentID,
      assessment.userName,
    ]);
  }

  ngOnDestroy(): void {}

  getAssessments(currentPage: number = 1) {
    this.assessmentsResponse = undefined;
    this.isLoader = true;
    let payload: GetAssessmentRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "createdAt",
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID,
      role: this.selectedRoleID
    };
    if (this.userService?.userInfo?.userID == null || this.filterProgram > 0) {
      payload.climateProgramID = this.filterProgram;
    }
    this.adminService.getAssessmentResults(payload).subscribe((assessments) => {
      this.assessmentsResponse = assessments;
      this.totalRecords = assessments.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = assessments.pageSize;
      this.isLoader = false;
    });
  }
  getAllProgramsByUserId() {
    this.adminService
      .getAllProgramsByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.programs = res.result;
          if (this.programs) {
            //this.selectedclimateProgramID = this.programs?.length > 0 ? this.programs[0].climateProgramID : null
          } else {
            this.toaster.showWarning("No program assigned");
          }
        },
      });
  }

    customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().toLowerCase().includes(term)
    );
  }

  selectChangedAssessment(assessmentPhase: AssessmentPhase,assessmentID: number){
    this.changeAssessment  =  {
      userID: this.userService.userInfo.userID,
      assessmentPhase: assessmentPhase,
      assessmentID: assessmentID,
    } as ChangeAssessmentStatusRequestDto;
  }
  changeAssessmentStatus() {
    if(this.changeAssessment == null) {
      this.toaster.showError("please select assessment");
    }

    this.adminService.changeAssessmentStatus(this.changeAssessment).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.getAssessments(this.currentPage);
          this.toaster.showSuccess(res.messages.join(", "));
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.toaster.showError("Failed to changed access");
      },
    });
  }
  selectAssessement(selectedAssessment: GetAssessmentResponse) {
    this.selectedAssessment = selectedAssessment;
    this.getUsersAssignedToProgram();
    this.opendialog();
  }
  transferAssessment(payload:TransferAssessmentRequestDto) {
    this.loading =true;
    if (this.selectedAssessment == null) {
      this.toaster.showError("Plese select assessment");
    }
    this.adminService.transferAssessment(payload).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getAssessments(this.currentPage);
          this.toaster.showSuccess(res.messages.join(", "));
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError("Failed to transfer assessment");
      },
    });
  }

  opendialog() {
    this.isOpendialog = true;
    setTimeout(() => {
      const modalEl = document.getElementById("exampleModal");
      if (modalEl) {
        let modalInstance = bootstrap.Modal.getInstance(modalEl);
        if (!modalInstance) {
          modalInstance = new bootstrap.Modal(modalEl);
        }
        modalInstance.show(); // ✅ use show()
      }
    }, 100);
  }
  closeModal() {
    this.loading = false;
    const modalEl = document.getElementById("exampleModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    this.isOpendialog = false;
  }
  getUsersAssignedToProgram() {
    if (this.selectedAssessment == null) {
      this.toaster.showError("Plese select assessment");
    }
    this.adminService
      .getUsersAssignedToProgram(this.selectedAssessment.climateProgramID)
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.userofSelectedProgramResponse = res.result ?? [];
          } else {
            this.toaster.showError(res.errors.join(", "));
          }
        },
        error: () => {
          this.toaster.showError("Failed to changed access");
        },
      });
  }
}
