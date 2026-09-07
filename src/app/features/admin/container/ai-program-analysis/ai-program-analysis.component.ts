import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { NgSelectModule } from '@ng-select/ng-select';
import { environment } from 'src/environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { PromptComponent } from 'src/app/shared/prompt/prompt.component';
import { AiProgramSummeryDto } from 'src/app/core/models/aiVm/AiProgramSummeryDto';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { AiProgramSummeryRequestDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestDto';
import { TypingTextComponent } from 'src/app/shared/standAlone/typing-text/typing-text.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { ChangedAiProgramEvaluationStatusDto } from 'src/app/core/models/aiVm/ChangedAiProgramEvaluationStatusDto';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { RegenerateAiScoreAndAddViewerComponent } from 'src/app/shared/standAlone/regenerate-ai-score-and-add-viewer/regenerate-ai-score-and-add-viewer.component';
import { GetAssignUserDto, PublicUserResponse } from 'src/app/core/models/UserInfo';
import { RegenerateAiSearchDto } from 'src/app/core/models/aiVm/RegenerateAiSearchDto';
import { AdminService } from '../../admin.service';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { ActivatedRoute } from '@angular/router';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
import { DownloadReportDto } from 'src/app/core/models/aiVm/DownloadReportDto';
import { ViewProgramDetailComponent } from 'src/app/shared/standAlone/view-program-detail/view-program-detail.component';

declare var bootstrap: any; // use Bootstrap JS API
@Component({
  selector: "app-aiprogram-analysis",
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgSelectModule,
    MatTooltipModule,
    TypingTextComponent,
    ViewProgramDetailComponent,
    CircularScoreComponent,
    SparklineScoreComponent,
    PaginationComponent,
    PromptComponent,
    RegenerateAiScoreAndAddViewerComponent,
    UtcToLocalTooltipDirective
  ],
  templateUrl: './ai-program-analysis.component.html',
  styleUrl: './ai-program-analysis.component.css'
})
export class AIProgramAnalaysisComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  isLoader: boolean = false;
  loading: boolean = false;
  aiPrograms: AiProgramSummeryDto[] = [];
  selectedProgram?: AiProgramSummeryDto | null = null;
  programs: ProgramVM[] | null = [];
  filterProgram!: number;
  selectedIndex: number = -1;
  selectedChangedStatusIndex: number = -1;
  evaluatorList: PublicUserResponse[] = [];
  isOpenResearchBox: boolean = false;
  isRecalcualteKpi: boolean = false;
  constructor(private aiComputationService: AiComputationService, private adminService: AdminService,
    private toaster: ToasterService, private userService: UserService, private cdr: ChangeDetectorRef,
    public commonService: CommonService, private route: ActivatedRoute,) { }

  ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params["climateProgramID"]) {
        this.filterProgram = +params["climateProgramID"];
      }
    });
    this.getAllProgramsByUserID();
    this.getAIPrograms();
  }

  ngOnDestroy(): void {
    document.body.style.overflow = "";
    document.body.style.paddingRight = "";
  }

  getAllProgramsByUserID() {
    this.adminService
      .getAllProgramsByUserId(this.userService.userInfo.userID ?? 0)
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.programs = res.result;
          } else {
            this.toaster.showError(res.errors.join(", "));
          }
        },
        error: () => {
          this.isLoader = false;
          this.toaster.showError("There is an error occure please try again");
        },
      });
  }

  getAIPrograms(currentPage: any = 1) {
    this.isLoader = true;
    let payload: AiProgramSummeryRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: "AIProgress",
      pageNumber: currentPage,
      pageSize: this.pageSize
    }
    if (this.userService?.userInfo?.userID == null || this.filterProgram > 0) {
      payload.climateProgramID = this.filterProgram;
    }
    this.aiPrograms = [];
    this.aiComputationService.getAIPrograms(payload).subscribe({
      next: (res) => {
        this.aiPrograms = res.data;
        this.totalRecords = res.totalRecords;
        this.currentPage = currentPage;
        this.pageSize = res.pageSize;
        this.isLoader = false;
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError("There is an Error Please Try later");
      },
    });
  }

  viewDetails(program: AiProgramSummeryDto) {
    this.selectedProgram = program;
    const sidebarEl = document.getElementById("kpiLayerSidebar");
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);
    // Clear selection when sidebar closes
    sidebarEl?.addEventListener(
      "hidden.bs.offcanvas",
      () => {
        this.selectedProgram = null;
        this.cdr.detectChanges();
      },
      { once: true }
    );

    offcanvas.show();
  }

  aiProgramDetailsReport(program: AiProgramSummeryDto, selectedIndex: number, format: string, mode: 'ai' | 'manual') {
    this.selectedIndex = selectedIndex;
    if (this.selectedIndex == -1) return;

    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: program.climateProgramID,
      format: format,
      reportType: mode
    };

    this.aiComputationService.aiProgramDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;

        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");

          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';

          link.href = url;
          link.download = `${program.programName}_Details_${new Date().toISOString().split("T")[0]}.${ext}`;

          document.body.appendChild(link);
          link.click();

          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);

          this.toaster.showSuccess("Report generated successfully");
        }
      },
      error: () => {
        this.selectedIndex = -1;
        this.toaster.showError("There is an error occurred please try again");
      }
    });
  }

  selectProgramToChangedStatus(program: AiProgramSummeryDto, selectedIndex: number) {
    this.selectedChangedStatusIndex = selectedIndex;
    this.selectedProgram = program;
  }

  changeAiStatus() {
    if (this.selectedProgram) {
      let paylod: ChangedAiProgramEvaluationStatusDto = {
        climateProgramID: this.selectedProgram.climateProgramID,
        isVerified: !this.selectedProgram.isVerified,
      };
      this.aiComputationService
        .changedAiProgramEvaluationStatus(paylod)
        .subscribe({
          next: (res: any) => {
            this.selectedChangedStatusIndex = -1;
            if (res.succeeded) {
              this.getAIPrograms();
              this.toaster.showSuccess(res.messages.join(", "));
            } else {
              this.toaster.showError(res.errors.join(", "));
            }
          },
          error: () => {
            this.toaster.showError("There is an error occure please try again");
            this.selectedChangedStatusIndex = -1;
          },
        });
    } else {
      this.toaster.showWarning("Please try again");
    }
  }

  cancelChangeAiStatus() {
    this.selectedChangedStatusIndex = -1;
  }

  opendialog(program: AiProgramSummeryDto) {
    this.isOpenResearchBox = true;
    if (!this.evaluatorList.length) {
      //this.getUsersAssignedToCity();
    }
    this.selectedProgram = program;
    setTimeout(() => {
      const modalEl = document.getElementById("RegenerateAIScoreModal");
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
    const modalEl = document.getElementById("RegenerateAIScoreModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
    this.isOpenResearchBox = false;
  }
  
  getUsersAssignedToCity() {
    let payload: GetAssignUserDto = {
      userID: this.userService.userInfo.userID,
    };
    this.adminService.GetEvaluatorByAnalyst(payload).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.evaluatorList = res.result ?? [];
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.toaster.showError("Failed to changed access");
      },
    });
  }

  regenerateAiSearch(payload: RegenerateAiSearchDto) {
    if (this.selectedProgram) {
      this.loading = true;

      this.aiComputationService.regenerateAiSearch(payload).subscribe({
        next: (res) => {
          this.loading = false;
          this.getAIPrograms();
          this.selectedChangedStatusIndex = -1;
          if (res.succeeded) {
            this.toaster.showSuccess(res.messages.join(", "));
          } else {
            this.toaster.showError(res.errors.join(", "));
          }
          this.closeModal();
        },
        error: () => {
          this.loading = false;
          this.toaster.showError("There is an error occure please try again");
          this.selectedChangedStatusIndex = -1;
          this.closeModal();
        },
      });
    } else {
      this.toaster.showWarning("Please try again");
      this.closeModal();
    }
  }

  aiAllProgramDetailsReport(format: string = 'pdf') {
    this.isLoader = true;

    const payload: DownloadReportDto = {
      climateProgramIDs: [],
      format: format
    };

    this.aiComputationService.aiAllProgramsDetailReport(payload).subscribe({
      next: (blob) => {
        this.isLoader = false;
        if (blob.size > 0) {
          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `All_Programs_Details_${new Date().toISOString().split('T')[0]}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.toaster.showSuccess('Report generated successfully');
        } else {
          this.toaster.showWarning(
            'No data available for the selected program or the PDF could not be generated.'
          );
        }
      },
      error: () => {
        this.toaster.showError('There is an error occured, please try again');
        this.isLoader = false;
      }
    });
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().includes(term)
    );
  }

  refresh() {
    this.getAIPrograms(this.currentPage);
  }

  onProgramDetailSaved() {
    this.getAIPrograms(this.currentPage);
  }

  reCalculateKpis() {
    this.isRecalcualteKpi = true;

    this.aiComputationService.reCalculateKpis().subscribe({
      next: (res) => {
        this.isRecalcualteKpi = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages.join(", "));
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
        this.closeModal();
      },
      error: () => {
        this.isRecalcualteKpi = false;
        this.toaster.showError("There is an error occure please try again");
        this.closeModal();
      },
    });

  }
}
