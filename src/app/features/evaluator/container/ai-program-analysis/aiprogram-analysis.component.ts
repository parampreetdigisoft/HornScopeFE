import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { NgSelectModule } from '@ng-select/ng-select';
import { environment } from 'src/environments/environment';
import { MatTooltipModule } from '@angular/material/tooltip';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { UserService } from 'src/app/core/services/user.service';
import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { AiProgramSummeryDto } from 'src/app/core/models/aiVm/AiProgramSummeryDto';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { AiProgramSummeryRequestDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestDto';
import { TypingTextComponent } from 'src/app/shared/standAlone/typing-text/typing-text.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { EvaluatorService } from '../../evaluator.service';
import { AddCommentComponent } from '../../features/add-comment/add-comment.component';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { ViewProgramDetailComponent } from "src/app/shared/standAlone/view-program-detail/view-program-detail.component";


declare var bootstrap: any; // 👈 use Bootstrap JS API
@Component({
  selector: 'app-aiprogram-analysis',
  standalone: true,
  imports: [TypingTextComponent, CommonModule,
    CircularScoreComponent, SparklineScoreComponent,
    PaginationComponent, FormsModule, NgSelectModule, AddCommentComponent,
    MatTooltipModule, ViewProgramDetailComponent],
  templateUrl: './aiprogram-analysis.component.html',
  styleUrl: './aiprogram-analysis.component.css'
})
export class AIProgramAnalaysisComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  isLoader: boolean = false;
  aiPrograms: AiProgramSummeryDto[] = []
  selectedProgram?: AiProgramSummeryDto | null = null;
  programs: ProgramVM[] | null = [];
  filterProgram!: number;
  selectedIndex: number = -1;
  loading: boolean = false;
  constructor(private aiComputationService: AiComputationService, private evaluatorService: EvaluatorService,
    private toaster: ToasterService, private userService: UserService, private cdr: ChangeDetectorRef) { }

  ngOnInit(): void {
    this.getAiAccessProgram();
    this.getAiPrograms();
  }
  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }
  getAiAccessProgram() {
    this.evaluatorService.getAiAccessProgram(this.userService.userInfo.userID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.programs = res.result;
        }
        else {
          this.toaster.showError(res.errors.join(', '));
        }
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError('There is an error occure please try again')
      }
    });
  }

  getAiPrograms(currentPage: any = 1) {
    this.isLoader = true;
    let payload: AiProgramSummeryRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: 'AIProgress',
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
        this.toaster.showError("There is an Error Please Try later")
      }
    })
  }
  viewDetails(program: AiProgramSummeryDto) {
    this.selectedProgram = program;
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);
    // Clear selection when sidebar closes
    sidebarEl?.addEventListener('hidden.bs.offcanvas', () => {
      this.selectedProgram = null;
      this.cdr.detectChanges();
    }, { once: true });

    offcanvas.show();
  }
  aiProgramDetailsReport(program: AiProgramSummeryDto, selectedIndex: number) {
    if (this.selectedIndex != -1) return;
    this.selectedIndex = selectedIndex;
    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: program.climateProgramID
    }
    this.aiComputationService.aiProgramDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;
        if (blob) {
          // Create download link
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `${program.programName}_Details_${new Date().toISOString().split('T')[0]}.pdf`;

          // Trigger download
          document.body.appendChild(link);
          link.click();

          // Cleanup
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.toaster.showSuccess('Report generated successfully')
        }
      },
      error: () => {
        this.toaster.showError('There is an error occure please try again');
        this.selectedIndex = -1;
      }
    });
  }
  opendialog(program: AiProgramSummeryDto) {
    this.selectedProgram = program;
    const modalEl = document.getElementById("RegenerateAIScoreModal");
    if (modalEl) {
      let modalInstance = bootstrap.Modal.getInstance(modalEl);
      if (!modalInstance) {
        modalInstance = new bootstrap.Modal(modalEl);
      }
      modalInstance.show(); // ✅ use show()
    }
  }

  closeModal() {
    const modalEl = document.getElementById("RegenerateAIScoreModal");
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance) modalInstance.hide();
  }

  addComment(payload: any) {
    this.loading = true;
    this.aiComputationService.addComment(payload).subscribe({
      next: (res) => {
        this.closeModal();
        this.loading = false;
        if (res.succeeded) {
          this.toaster.showSuccess(res.messages.join(', '));
        }
        else {
          this.toaster.showError(res.errors.join(', '));
        }
        this.closeModal();
      },
      error: () => {
        this.closeModal();
        this.loading = false;
        this.toaster.showError('There is an error occure please try again')
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
    this.getAiPrograms(this.currentPage);
  }

  onProgramDetailSaved() {
    this.getAiPrograms(this.currentPage);
  }

}
