import { Component, OnDestroy, OnInit } from '@angular/core';
import { AdminService } from '../../admin.service';
import { PaginationCountryRequest, PaginationUserRequest } from 'src/app/core/models/PaginationRequest';
import { BulkAddCountryDto, CountryVM } from '../../../../core/models/CountryVM';
import { PaginationResponse } from 'src/app/core/models/PaginationResponse';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { environment } from 'src/environments/environment';
import { ExportCountryWithOptionDto } from 'src/app/core/models/ExportCountryWithOptionDto';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { DownloadReportDto } from 'src/app/core/models/aiVm/DownloadReportDto';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
declare var bootstrap: any;
@Component({
  selector: 'app-country',
  templateUrl: './country.component.html',
  styleUrl: './country.component.css'
})
export class CountryComponent implements OnInit, OnDestroy {
  urlBase = environment.apiUrl;
  selectedCountry: CountryVM | null | undefined = null;
  countriesResponse: PaginationResponse<CountryVM> | undefined;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  loading: boolean = false;
  isLoader: boolean = true;
  isOpendialog = false;
  isExporting: boolean = false;
  countries: CountryVM[] = [];
  selectedCountries: CountryVM[] = [];
  isReportExporting: boolean = false;
  private selectedCountryIds = new Set<number>();
  searchableCountries: CountryVM[] = [];
  filterCountry!: number;

  constructor(private adminService: AdminService, private toaster: ToasterService, private userService: UserService,
    private aiComputationService: AiComputationService
  ) { }

  ngOnInit(): void {
    this.getCountries(1);
    this.getCountryUserCountries();
  }

  getCountries(currentPage: number = 1) {
    this.countriesResponse = undefined;
    this.isLoader = true;
    let payload: PaginationCountryRequest = {
      sortDirection: SortDirection.DESC,
      sortBy: 'score',
      pageNumber: currentPage,
      pageSize: this.pageSize
    }

    if (this.filterCountry > 0) {
      payload.countryID = this.filterCountry;
    }

    this.adminService.getCountries(payload).subscribe(countries => {
      this.countriesResponse = countries;
      this.totalRecords = countries.totalRecords;
      this.currentPage = currentPage;
      this.pageSize = countries.pageSize;
      this.isLoader = false;
    });

  }

  editCountry(country: CountryVM | null) {
    this.selectedCountry = country;
  }
  getCountryUserCountries() {
    this.adminService
      .getAllCountriesByUserId(this.userService.userInfo.userID ?? 0)
      .subscribe({
        next: (res) => {
          if (res.succeeded) {
            this.searchableCountries = res.result ?? [];
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


  deleteCountry() {
    if (this.selectedCountry === null) {
      this.toaster.showError('No country selected for deletion');
      return;
    }
    this.adminService.deleteCountry(this.selectedCountry?.countryID ?? 0).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.getCountries(this.currentPage);
          this.toaster.showSuccess(res?.messages.join(', '));
        } else {
          this.toaster.showError(res?.errors.join(', '));
        }
      },
      error: () => {
        this.toaster.showError('Failed to delete country');
      }
    });
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/noImageAvailable.png';
  }
  addUpdateCountry(formData: FormData) {
    this.loading = true;
    this.adminService.AddUpdateCountry(formData).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getCountries(this.currentPage);
          this.toaster.showSuccess(res?.messages?.join(', '));
        } else {
          this.toaster.showError(res?.errors?.join(', '));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError('Failed to edit country');
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
  openCountryModal(country: CountryVM | null) {
    this.selectedCountry = country ?? null;
    this.opendialog();
  }
  ngOnDestroy(): void {

  }
  bulkImport(country: CountryVM[]) {
    this.loading = true;
    let payload: BulkAddCountryDto = {
      countries: country
    }
    this.adminService.addBulkCountry(payload).subscribe({
      next: (res) => {
        this.closeModal();
        if (res.succeeded) {
          this.getCountries(1);
          this.toaster.showSuccess(res?.messages.join(', '));
        } else {
          this.toaster.showError(res?.errors.join(', '));
        }
      },
      error: () => {
        this.closeModal();
        this.toaster.showError('Failed to add countries');
      }
    });
  }

  exportCountries(isAllCountry?: boolean, isRanking?: boolean, isPillarLevel?: boolean) {

    this.isExporting = true;
    let payload: ExportCountryWithOptionDto = {
      isAllCountry: isAllCountry,
      isRanking: isRanking,
      isPillarLevel: isPillarLevel
    }
    if (this.selectedCountries.length && !isAllCountry) {
      payload.countryIDs = this.selectedCountries.map(x => x.countryID);
    }


    this.adminService.exportCountries(payload).subscribe({
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
        a.download = `Countries_Progress_${formattedDate}.xlsx`;
        a.click();
        this.toaster.showSuccess("Domains History downloaded successfully");
      },
      error: () => {
        this.isExporting = false;
        this.toaster.showError('Failed to download countries');
      }
    });
  }

  aiAllCountryDetailsReport(format: string = 'pdf') {

    this.isReportExporting = true;

    const payload: DownloadReportDto = {
      countryIDs: this.selectedCountries.map(x => x.countryID),
      format: format
    };

    this.aiComputationService.aiAllCountriesDetailReport(payload).subscribe({
      next: (blob) => {
        this.isReportExporting = false;
        if (blob.size > 0) {
          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';

          const url = window.URL.createObjectURL(blob);
          const link = document.createElement('a');
          link.href = url;
          link.download = `Country_Ranking_Report_${new Date().toISOString().split('T')[0]}.${ext}`;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          window.URL.revokeObjectURL(url);
          this.toaster.showSuccess('Report generated successfully');
        } else {
          this.toaster.showWarning(
            'No data available for the selected country or the PDF could not be generated.'
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
    const currentData = this.countriesResponse?.data ?? [];
    return (
      currentData.length > 0 &&
      currentData.every(country => this.selectedCountryIds.has(country.countryID))
    );
  }

  // ─── Computed: are SOME (but not all) countries on current page selected? ────
  get isSomeCurrentPageSelected(): boolean {
    const currentData = this.countriesResponse?.data ?? [];
    return (
      currentData.some(country => this.selectedCountryIds.has(country.countryID)) &&
      !this.isAllCurrentPageSelected
    );
  }

  AllCountrySelected(event: any) {
    const isChecked = event.target.checked;
    const currentData = this.countriesResponse?.data ?? [];

    if (isChecked) {
      currentData.forEach(country => {
        country.selected = true;
        if (!this.selectedCountryIds.has(country.countryID)) {
          this.selectedCountryIds.add(country.countryID);
          this.selectedCountries.push(country);
        }
      });
    } else {
      currentData.forEach(country => {
        country.selected = false;
        this.selectedCountryIds.delete(country.countryID);
      });
      const currentIds = new Set(currentData.map(c => c.countryID));
      this.selectedCountries = this.selectedCountries.filter(
        c => !currentIds.has(c.countryID)
      );
    }
  }
  countrySelected(event: any, country: CountryVM) {
    const isChecked = event.target.checked;
    country.selected = isChecked;

    if (isChecked) {
      if (!this.selectedCountryIds.has(country.countryID)) {
        this.selectedCountryIds.add(country.countryID);
        this.selectedCountries.push(country);
      }
    } else {
      this.selectedCountryIds.delete(country.countryID);
      this.selectedCountries = this.selectedCountries.filter(
        c => c.countryID !== country.countryID
      );
    }
  }
  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.countryName?.toLowerCase().includes(term) ||
      item.countryAliasName?.toLowerCase().includes(term)
    );
  }
}
