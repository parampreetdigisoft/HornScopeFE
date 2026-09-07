import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { ViewProgramDetailComponent } from 'src/app/shared/standAlone/view-program-detail/view-program-detail.component';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { AiProgramSummeryRequestDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestDto';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { UserService } from 'src/app/core/services/user.service';
import { AiProgramSummeryDto } from 'src/app/core/models/aiVm/AiProgramSummeryDto';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AiProgramSummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiProgramSummeryRequestPdfDto';
import { CommonService } from 'src/app/core/services/common.service';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
import { ClientService } from '../../client.service';
import { ActivatedRoute } from '@angular/router';

declare var bootstrap: any; // 👈 use Bootstrap JS API
@Component({
  selector: 'app-aiprogram-analysis',
  standalone: true,
    imports: [CommonModule,
    ViewProgramDetailComponent, CircularScoreComponent, PaginationComponent, FormsModule, NgSelectModule,
    MatTooltipModule],
  templateUrl: './aiprogram-analysis.component.html',
  styleUrl: './aiprogram-analysis.component.css'
})
export class AIProgramAnalysisComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  isLoader: boolean = false;
  aiPrograms: AiProgramSummeryDto[] = []
  selectedProgram?: AiProgramSummeryDto | null = null;
  programs: ProgramVM[] | null = [];
  filterProgram!: number;
  isDownloading: boolean = false;
  selectedIndex: number = -1;

  constructor(private aiComputationService: AiComputationService, private clientService: ClientService,
    private toaster: ToasterService, private userService: UserService, private cdr: ChangeDetectorRef, public commonService: CommonService, private route: ActivatedRoute) { }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

   ngOnInit(): void {
    this.route.queryParams.subscribe((params) => {
      if (params["climateProgramID"]) {
        this.filterProgram = +params["climateProgramID"];
      }
    });
    this.getClientPrograms();
    this.getAIPrograms();
  }
  

  getClientPrograms() {
    this.clientService.getClientPrograms().subscribe({
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


  getAIPrograms(currentPage: any = 1) {
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

  aiProgramDetailsReport(program: AiProgramSummeryDto, selectedIndex: number, format: string) {
    this.selectedIndex = selectedIndex;
    if (this.selectedIndex == -1) return;

    let payload: AiProgramSummeryRequestPdfDto = {
      climateProgramID: program.climateProgramID,
      format: format
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
   customSearchFn(term: string, item: any) {    
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.programAliasName?.toLowerCase().includes(term)
    );
}

  onProgramDetailSaved() {
    this.getAIPrograms(this.currentPage);
  }
}
