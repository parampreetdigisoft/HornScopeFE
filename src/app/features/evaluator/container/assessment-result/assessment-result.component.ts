import { Component, OnDestroy, OnInit } from "@angular/core";
import { ProgramVM } from "src/app/core/models/ProgramVM";
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
import { SendRequestMailToUpdateProgram } from "src/app/core/models/AnalystVM";

@Component({
  selector: "app-assessment-result",
  templateUrl: "./assessment-result.component.html",
  styleUrl: "./assessment-result.component.css",
})
export class AssessmentResultComponent implements OnInit {

  selectedclimateProgramID: number | any = "";
  assessmentsResponse: PaginationResponse<GetAssessmentResponse> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  programs: ProgramVM[] | null = [];
  isLoader: boolean = false;
  selectedAssessment!:GetAssessmentResponse;

  constructor(
    private evaluatorService: EvaluatorService,
    public commonService: CommonService,
    private userService: UserService,
    private toaster: ToasterService,
    private router: Router
  ) {}

  ngOnInit(): void {
    this.getAllProgramsByUserId();
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
      climateProgramID: this.selectedclimateProgramID
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
  getAllProgramsByUserId() {
    this.evaluatorService
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

  selectAssessment(assessment: GetAssessmentResponse){
    this.selectedAssessment = assessment;
  }

  assessmentPhaseAction(assessment: GetAssessmentResponse) {
    if(!assessment) return;
    
    let userRole = this.userService.userInfo.role;
    switch (assessment.assessmentPhase) {
      case AssessmentPhase.InProgress: {
        this.evaluatorService.staffProgramMappingIDSubject$.next(
          assessment.staffProgramMappingID
        );
        this.router.navigate(["evaluator/make-assessment"]);
        break;
      }
      case  AssessmentPhase.EditApproved: {
        this.evaluatorService.staffProgramMappingIDSubject$.next(
          assessment.staffProgramMappingID
        );
        this.router.navigate(["evaluator/make-assessment"]);
        break;
      }
      case AssessmentPhase.EditRequested:
        break;
        case AssessmentPhase.EditRejected : {
        this.sendMailForEditAssessment(
          assessment.staffProgramMappingID,
          assessment.assignedByUserId
        );
        break;
      }
      case AssessmentPhase.Completed : {
        this.sendMailForEditAssessment(
          assessment.staffProgramMappingID,
          assessment.assignedByUserId
        );
        break;
      }

    }
  }

  sendMailForEditAssessment(staffProgramMappingID: number, mailToUserID: number) {
    let payload: SendRequestMailToUpdateProgram = {
      userID: this.userService.userInfo.userID,
      staffProgramMappingID: staffProgramMappingID,
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
