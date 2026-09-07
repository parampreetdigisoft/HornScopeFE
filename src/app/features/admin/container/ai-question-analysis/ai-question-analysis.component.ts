import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, inject, OnChanges, OnInit, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ActivatedRoute } from '@angular/router';
import { NgSelectModule } from '@ng-select/ng-select';
import { forkJoin } from 'rxjs';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { AiPillarQuestionsRequestDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestDto';
import { AIEstimatedQuestionScoreDto } from 'src/app/core/models/aiVm/AIEstimatedQuestionScoreDto';
import { AITrustLevelVM } from 'src/app/core/models/aiVm/AITrustLevelVM';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { TypingTextComponent } from 'src/app/shared/standAlone/typing-text/typing-text.component';
import { ViewAiQuestionDetailsComponent } from '../../../../shared/standAlone/view-ai-question-details/view-ai-question-details.component';
import { AdminService } from 'src/app/features/admin/admin.service';
import { UserService } from 'src/app/core/services/user.service';
import { CommonService } from 'src/app/core/services/common.service';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';

declare var bootstrap: any; // 👈 use Bootstrap JS API
@Component({
  selector: 'app-ai-question-analysis',
  standalone: true,
  imports: [TypingTextComponent, CommonModule,
    ViewAiQuestionDetailsComponent, CircularScoreComponent, SparklineScoreComponent,
    PaginationComponent, FormsModule, NgSelectModule,
    MatTooltipModule, UtcToLocalTooltipDirective],
  templateUrl: './ai-question-analysis.component.html',
  styleUrl: './ai-question-analysis.component.css'
})
export class AiQuestionAnalysisComponent implements OnInit, OnChanges {
  selectedclimateProgramID!: number;
  selectedPillarID!: number;
  selectedQuestion: AIEstimatedQuestionScoreDto | null = null;
  isLoader: boolean = false;
  programs: ProgramVM[] = [];
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  aiQuestions: AIEstimatedQuestionScoreDto[] = [];
  pillars: PillarsVM[] = [];
  aiTrustLevels: AITrustLevelVM[] = [];
  adminService = inject(AdminService);
  userService = inject(UserService);
  headerTextValue: string | null = null;
  headerTextRepeatation: boolean = false;
  constructor(private route: ActivatedRoute, private toaster: ToasterService, private aiComputationService: AiComputationService, private cdr: ChangeDetectorRef, public commonService: CommonService) { }

  ngOnChanges(changes: SimpleChanges): void {
    //throw new Error('Method not implemented.');
  }

  updateHeaderText() {
    this.headerTextValue = null;
    this.headerTextRepeatation = false;

    const p = this.pillars.find(x => x.pillarID === this.selectedPillarID)?.pillarName ?? '';
    const c = this.programs.find(x => x.climateProgramID === this.selectedclimateProgramID)?.programName ?? '';

    setTimeout(() => {
      this.headerTextRepeatation = true;

      const truncatedPillar =
        p.length > 27 ? `${p.substring(0, 20)}...` : p;

      this.headerTextValue =
        c && p
          ? `${c} > ${truncatedPillar} Analysis`
          : '';

    }, 500);
  }

  ngOnInit(): void {
    this.isLoader = true;
    this.loadInitialData();
    this.getAITrustLevels();
    this.route.queryParams.subscribe(params => {
      let cid = +params['climateProgramID'] || null;
      let pid = +params['pillarID'] || null;
      if (pid && cid) {
        this.selectedclimateProgramID = Number(cid);
        this.selectedPillarID = Number(pid);
        this.getAIPillarQuestions();
      }
    });
  }

  getAITrustLevels() {
    this.aiComputationService.getAITrustLevels().subscribe((p) => {
      this.aiTrustLevels = p.result || [];
    });
  }


  loadInitialData() {
    this.isLoader = true;

    forkJoin({
      pillarsRes: this.adminService.getAllPillars(),
      programsRes: this.adminService.getAllProgramsByUserId(this.userService.userInfo?.userID ?? 0)
    }).subscribe({
      next: ({ pillarsRes, programsRes }) => {

        this.pillars = pillarsRes ?? [];
        if (programsRes.succeeded) {
          this.programs = programsRes.result ?? [];
        } else {
          this.toaster.showError(programsRes.errors.join(', '));
        }

        if ((!this.selectedPillarID && !this.selectedclimateProgramID) && this.pillars.length && this.programs.length) {
          this.selectedPillarID = this.pillars[0].pillarID
          this.selectedclimateProgramID = this.programs[0].climateProgramID
          this.getAIPillarQuestions()
        }
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError('There is an error occurred, please try again');
      }
    });
  }

  getAIPillarQuestions(currentPage: any = 1) {
    this.isLoader = true;
    let payload: AiPillarQuestionsRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: 'AIProgress',
      pageNumber: currentPage,
      pageSize: this.pageSize
    }
    if (this.selectedclimateProgramID > 0) {
      payload.climateProgramID = this.selectedclimateProgramID;
    }
    if (this.selectedPillarID > 0) {
      payload.pillarID = this.selectedPillarID;
    }

    this.aiComputationService.getAIPillarQuestions(payload).subscribe({
      next: (res) => {
        this.updateHeaderText();
        this.isLoader = false;
        this.aiQuestions = res.data;
        this.totalRecords = res.totalRecords;
        this.currentPage = currentPage;
        this.pageSize = res.pageSize;
        this.isLoader = false;
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError("There is an error please try later")
      }
    })
  }

  discrepancy(question: any): number {
    let discrepancy = Math.abs((question?.evaluatorScore ?? 0) - (question?.aiScore ?? 0));
    return discrepancy;
  }

  viewDetails(program: AIEstimatedQuestionScoreDto) {
    this.selectedQuestion = program;
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);

    // Clear selection when sidebar closes
    sidebarEl?.addEventListener('hidden.bs.offcanvas', () => {
      this.selectedQuestion = null;
      this.cdr.detectChanges();
    }, { once: true });

    offcanvas.show();
  }
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.programAliasName?.toLowerCase().includes(term)
    );
  }

  refresh() {
    this.getAIPillarQuestions(this.currentPage);
  }

  onQuestionDetailSaved() {
    this.getAIPillarQuestions(this.currentPage);
  }
}
