import { Component, OnDestroy, OnInit } from "@angular/core";
import { CountryVM } from "src/app/core/models/CountryVM";
import { PaginationUserRequest } from "src/app/core/models/PaginationRequest";
import { PaginationResponse } from "src/app/core/models/PaginationResponse";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { Router } from "@angular/router";
import { EvaluatorService } from "../../evaluator.service";
import { GetAssessmentResponse } from "src/app/core/models/AssessmentResponse";
import { GetAssessmentRequestDto } from "src/app/core/models/AssessmentRequest";
import { SortDirection } from "src/app/core/enums/SortDirection";
import { CommonService } from "src/app/core/services/common.service";
import { AssessmentPhase } from "src/app/core/enums/AssessmentPhase";
import { SendRequestMailToUpdateCountry } from "src/app/core/models/AnalystVM";

@Component({
  selector: "app-assessment-result",
  templateUrl: "./assessment-result.component.html",
  styleUrl: "./assessment-result.component.css",
})
export class AssessmentResultComponent implements OnInit {
  currentYear = new Date().getFullYear();
  selectedYear= this.currentYear;
  selectedCountryID: number | any = "";
  assessmentsResponse: PaginationResponse<GetAssessmentResponse> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  countries: CountryVM[] | null = [];
  isLoader: boolean = true;
  selectedAssessment!:GetAssessmentResponse;

  constructor(
    private evaluatorService: EvaluatorService,
    public commonService: CommonService,
    private userService: UserService,
    private toaster: ToasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getAllCountriesByUserId();
    this.getAssessments();
  }

  goToAssessment(assessment: GetAssessmentResponse) {
    this.router.navigate([
      "/evaluator/assessment-result",
      assessment.assessmentID,
      assessment.userName,
    ]);
  }

  ngOnDestroy(): void {}

  getAssessments(currentPage: number = 1) {
    this.isLoader = true;
    this.assessmentsResponse = undefined;
    let payload: GetAssessmentRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "createdAt",
      pageNumber: currentPage,
      pageSize: this.pageSize,
      userId: this.userService?.userInfo?.userID,
      countryID: this.selectedCountryID,
      updatedAt:this.commonService.getStartOfYearLocal(this.selectedYear)
    };
    this.evaluatorService
      .getAssessmentResults(payload)
      .subscribe((assessments) => {
        this.assessmentsResponse = assessments;
        this.totalRecords = assessments.totalRecords;
        this.currentPage = currentPage;
        this.pageSize = assessments.pageSize;
        this.isLoader = false;
      });
  }
  getAllCountriesByUserId() {
    this.evaluatorService
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

  selectAssessment(assessment: GetAssessmentResponse){
    this.selectedAssessment = assessment;
  }

  assessmentPhaseAction(assessment: GetAssessmentResponse) {
    if(!assessment) return;
    
    let userRole = this.userService.userInfo.role;
    switch (assessment.assessmentPhase) {
      case AssessmentPhase.InProgress: {
        this.evaluatorService.userCountryMappingIDSubject$.next(
          assessment.userCountryMappingID
        );
        this.router.navigate(["evaluator/make-assessment"]);
        break;
      }
      case  AssessmentPhase.EditApproved: {
        this.evaluatorService.userCountryMappingIDSubject$.next(
          assessment.userCountryMappingID
        );
        this.router.navigate(["evaluator/make-assessment"]);
        break;
      }
      case AssessmentPhase.EditRequested:
        break;
        case AssessmentPhase.EditRejected : {
        this.sendMailForEditAssessment(
          assessment.userCountryMappingID,
          assessment.assignedByUserId
        );
        break;
      }
      case AssessmentPhase.Completed : {
        this.sendMailForEditAssessment(
          assessment.userCountryMappingID,
          assessment.assignedByUserId
        );
        break;
      }

    }
  }

  sendMailForEditAssessment(userCountryMappingID: number, mailToUserID: number) {
    let payload: SendRequestMailToUpdateCountry = {
      userID: this.userService.userInfo.userID,
      userCountryMappingID: userCountryMappingID,
      mailToUserID: mailToUserID,
    };
    this.evaluatorService.sendMailForEditAssessment(payload).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages.join(", "));
          this.getAssessments(this.currentPage);
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.toaster.showError("Failed to provide access");
      },
    });
  }
}
