import { Component, OnInit } from "@angular/core";
import { CountryVM } from "src/app/core/models/CountryVM";
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
  selectedYear = new Date().getFullYear();
  isLoader: boolean = true;
  isOpendialog = false;
  selectedCountryID?: number | null;
  selectedRoleID?: UserRoleValue | null;
  selectedAssessment: GetAssessmentResponse | any = "";
  changeAssessment: ChangeAssessmentStatusRequestDto | any = "";
  assessmentsResponse: PaginationResponse<GetAssessmentResponse> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  countries: CountryVM[] | null = [];
  loading: boolean = false;
  evaluators: PublicUserResponse[] | null = [];
  userofSelectedCountryResponse: GetAssessmentResponse[] = [];

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
    this.getAllCountriesByUserId();
    this.route.paramMap.subscribe((params) => {
      let rid = params.get("roleID");
      let cid = params.get("countryID");
      if (rid && cid) {
        this.selectedRoleID = Number(rid) as UserRoleValue;
        this.selectedCountryID = Number(cid);
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

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.countryName?.toLowerCase().includes(term) ||
      item.countryAliasName?.toLowerCase().includes(term)
    );
  }
  getAssessments(currentPage: number = 1) {
    this.assessmentsResponse = undefined;
    this.isLoader = true;
    let payload: GetAssessmentRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "createdAt",
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID,
      countryID: this.selectedCountryID || null,
      role: this.selectedRoleID || null,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
    };
    this.adminService.getAssessmentResults(payload).subscribe((assessments) => {
      this.assessmentsResponse = assessments;
      this.totalRecords = assessments.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = assessments.pageSize;
      this.isLoader = false;
    });
  }
  getAllCountriesByUserId() {
    this.adminService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          this.countries = res.result;
          if (this.countries) {
            //this.selectedCountryID = this.countries?.length > 0 ? this.countries[0].countryID : null
          } else {
            this.toaster.showWarning("No country assigned");
          }
        },
      });
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
    this.getUsersAssignedToCountry();
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
  getUsersAssignedToCountry() {
    if (this.selectedAssessment == null) {
      this.toaster.showError("Plese select assessment");
    }
    this.adminService
      .getUsersAssignedToCountry(this.selectedAssessment.countryID)
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.userofSelectedCountryResponse = res.result ?? [];
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
