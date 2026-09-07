import { Component, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { PaginationProgramRequest } from 'src/app/core/models/PaginationRequest';
import { BulkAddProgramDto, ProgramVM } from '../../../../core/models/ProgramVM';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { environment } from 'src/environments/environment';
import { ExportProgramsWithOptionDto } from 'src/app/core/models/ExportProgramsWithOptionDto';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { DownloadReportDto } from 'src/app/core/models/aiVm/DownloadReportDto';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
declare var bootstrap: any;
@Component({
  selector: 'app-programs',
  templateUrl: './programs.component.html',
  styleUrl: './programs.component.css'
})
export class ProgramsComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  selectedProgram: ProgramVM | null | undefined = null;
  programsResponse: PaginationResponse<ProgramVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  loading: boolean = false;
  isLoader: boolean = false;
  isOpendialog = false;
  isExporting: boolean = false;
  programs: ProgramVM[] = [];
  selectedPrograms: ProgramVM[] = [];
  isReportExporting: boolean = false;
  private selectedclimateProgramIDs = new Set<number>();
  searchablePrograms: ProgramVM[] = [];
  filterProgram!: number;

  constructor(private adminService: AdminService, private toaster: ToasterService, private userService: UserService,
    private aiComputationService: AiComputationService
  ) { }

  ngOnInit(): void {
    this.getPrograms(1);
    this.getProgramUserPrograms();
  }

  getPrograms(currentPage: number = 1) {
    this.programsResponse = undefined;
    this.isLoader = true;
    let payload: PaginationProgramRequest = {
      sortDirection: SortDirection.DESC,
      sortBy: 'score',
      pageNumber: currentPage,
      pageSize: this.pageSize
    }

    if (this.filterProgram > 0) {
      payload.climateProgramID = this.filterProgram;
    }

    this.adminService.getPrograms(payload).subscribe(programs => {
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

  editProgram(program: ProgramVM | null) {
    this.selectedProgram = program;
  }

  getProgramUserPrograms() {
    this.adminService
      .getAllProgramsByUserId(this.userService.userInfo.userID ?? 0)
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.searchablePrograms = res.result ?? [];
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


  deleteProgram() {
    if (this.selectedProgram === null) {
      this.toaster.showError('No program selected for deletion');
      return;
    }
    this.adminService.deleteProgram(this.selectedProgram?.climateProgramID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.getPrograms(this.currentPage);
          this.toaster.showSuccess(res?.messages.join(', '));
        } else {
          this.toaster.showError(res?.errors.join(', '));
        }
      },
      error: () => {
        this.toaster.showError('Failed to delete program');
      }
    });
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }

  addUpdateProgram(formData: FormData) {
    this.loading = true;
    this.adminService.addUpdateProgram(formData).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getPrograms(this.currentPage);
          this.getProgramUserPrograms();
          this.toaster.showSuccess(res?.messages?.join(', '));
        } else {
          this.toaster.showError(res?.errors?.join(', '));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError('Failed to edit program');
      }
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
    const homeTab = document.querySelector('#pills-home-tab') as HTMLElement;
    if (homeTab) {
      homeTab.click();
    }
    const modalEl = document.getElementById('exampleModal');
    const modalInstance = bootstrap.Modal.getInstance(modalEl);
    if (modalInstance)
      modalInstance.hide();
    this.isOpendialog = false;
  }
  openProgramModal(program: ProgramVM | null) {
    this.selectedProgram = program ?? null;
    this.opendialog();
  }
  ngOnDestroy(): void {

  }
  bulkImport(program: ProgramVM[]) {
    this.loading = true;
    let payload: BulkAddProgramDto = {
      programs: program
    }
    this.adminService.addBulkPrograms(payload).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getPrograms(1);
          this.toaster.showSuccess(res?.messages.join(', '));
        } else {
          this.toaster.showError(res?.errors.join(', '));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError('Failed to add programs');
      }
    });
  }

  exportPrograms(isAllProgram?: boolean, isRanking?: boolean, isPillarLevel?: boolean) {

    this.isExporting = true;
    let payload: ExportProgramsWithOptionDto = {
      isAllPrograms: isAllProgram,
      isRanking: isRanking,
      isPillarLevel: isPillarLevel
    }
    if (this.selectedPrograms.length && !isAllProgram) {
      payload.climateProgramIDs = this.selectedPrograms.map(x => x.climateProgramID);
    }


    this.adminService.exportPrograms(payload).subscribe({
      next: (res) => {
        this.isExporting = false;
        const formattedDate = new Date().toLocaleDateString('en-US', {
          month: '2-digit',
          day: '2-digit',
          year: 'numeric'
        }).replace(/\//g, '-');

        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = `Programs_Progress_${formattedDate}.xlsx`;
        a.click();
        this.toaster.showSuccess("Pillars History downloaded successfully");
      },
      error: () => {
        this.isExporting = false;
        this.toaster.showError('Failed to download programs');
      }
    });
  }

  aiAllProgramDetailsReport(format: string = 'pdf') {

    this.isReportExporting = true;

    const payload: DownloadReportDto = {
      climateProgramIDs: this.selectedPrograms.map(x => x.climateProgramID),
      format: format
    };

    this.aiComputationService.aiAllProgramsDetailReport(payload).subscribe({
      next: (blob) => {
        this.isReportExporting = false;
        if (blob.size > 0) {
          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Program_Ranking_Report_${new Date().toISOString().split('T')[0]}.${ext}`;
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
        this.isReportExporting = false;
      }
    });
  }
  get isAllCurrentPageSelected(): boolean {
    const currentData = this.programsResponse?.data ?? [];
    return (
      currentData.length > 0 &&
      currentData.every(program => this.selectedclimateProgramIDs.has(program.climateProgramID))
    );
  }

  // ─── Computed: are SOME (but not all) programs on current page selected? ────
  get isSomeCurrentPageSelected(): boolean {
    const currentData = this.programsResponse?.data ?? [];
    return (
      currentData.some(program => this.selectedclimateProgramIDs.has(program.climateProgramID)) &&
      !this.isAllCurrentPageSelected
    );
  }

  AllProgramSelected(event: any) {
    const isChecked = event.target.checked;
    const currentData = this.programsResponse?.data ?? [];

    if (isChecked) {
      currentData.forEach(program => {
        program.selected = true;
        if (!this.selectedclimateProgramIDs.has(program.climateProgramID)) {
          this.selectedclimateProgramIDs.add(program.climateProgramID);
          this.selectedPrograms.push(program);
        }
      });
    } else {
      currentData.forEach(program => {
        program.selected = false;
        this.selectedclimateProgramIDs.delete(program.climateProgramID);
      });
      const currentIds = new Set(currentData.map(c => c.climateProgramID));
      this.selectedPrograms = this.selectedPrograms.filter(
        c => !currentIds.has(c.climateProgramID)
      );
    }
  }
  programSelected(event: any, program: ProgramVM) {
    const isChecked = event.target.checked;
    program.selected = isChecked;

    if (isChecked) {
      if (!this.selectedclimateProgramIDs.has(program.climateProgramID)) {
        this.selectedclimateProgramIDs.add(program.climateProgramID);
        this.selectedPrograms.push(program);
      }
    } else {
      this.selectedclimateProgramIDs.delete(program.climateProgramID);
      this.selectedPrograms = this.selectedPrograms.filter(
        c => c.climateProgramID !== program.climateProgramID
      );
    }
  }
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
        item.location?.toLowerCase().includes(term) ||
        item.year?.toString().includes(term)
    );
  }
}
