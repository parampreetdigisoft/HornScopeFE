import { ChangeDetectorRef, Component, OnDestroy, OnInit } from '@angular/core';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { AiCountrySummeryRequestDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestDto';
import { SortDirection } from 'src/app/core/enums/SortDirection';
import { UserService } from 'src/app/core/services/user.service';
import { AiCountrySummeryDto } from 'src/app/core/models/aiVm/AiCountrySummeryDto';
import { environment } from 'src/environments/environment';
import { CommonModule } from '@angular/common';
import { TypingTextComponent } from 'src/app/shared/standAlone/typing-text/typing-text.component';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { ActivatedRoute } from '@angular/router';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { PaginationComponent } from 'src/app/shared/pagination/pagination.component';
import { FormsModule } from '@angular/forms';
import { NgSelectModule } from '@ng-select/ng-select';
import { NgSelectDefaultsDirective } from 'src/app/shared/directives/ng-select-defaults.directive';
import { MatTooltipModule } from '@angular/material/tooltip';
import {  ViewCountryDetailComponent } from '../../features/view-country-detail/view-country-detail.component';
import { AiCountrySummeryRequestPdfDto } from 'src/app/core/models/aiVm/AiCountrySummeryRequestPdfDto';
import { CommonService } from 'src/app/core/services/common.service';
import { DocumentFormat } from 'src/app/core/enums/documentFormat';
import { CountryUserService } from '../../country-user.service';

declare var bootstrap: any; // use Bootstrap JS API
@Component({
  selector: 'app-aicountry-analysis',
  standalone: true,
  imports: [TypingTextComponent, CommonModule,
    ViewCountryDetailComponent, CircularScoreComponent, PaginationComponent, FormsModule, NgSelectModule, NgSelectDefaultsDirective,
    MatTooltipModule],
  templateUrl: './aicountry-analysis.component.html',
  styleUrl: './aicountry-analysis.component.css'
})
export class AICountryAnalaysisComponent implements OnInit, OnDestroy {
  selectedYear = new Date().getFullYear();
  urlBase = environment.apiUrl;
  totalRecords: number = 0;
  pageSize: number = 10;
  currentPage: number = 1;
  isLoader: boolean = true;
  aiCountries: AiCountrySummeryDto[] = []
  selectedCountry?: AiCountrySummeryDto | null = null;
  countries: CountryVM[] | null = [];
  filterCountry!: number;
  isDownloading: boolean = false;
  selectedIndex: number = -1;

  constructor(private aiComputationService: AiComputationService, private countryUserService: CountryUserService,
    private toaster: ToasterService, private userService: UserService, private cdr: ChangeDetectorRef,public commonService: CommonService,
    private route: ActivatedRoute) { }

  ngOnDestroy(): void {
    document.body.style.overflow = '';
    document.body.style.paddingRight = '';
  }

  ngOnInit(): void {
     this.route.queryParams.subscribe((params) => {
      if (params["countryID"]) {
        this.filterCountry = +params["countryID"];
        this.selectedYear = +params["year"] || new Date().getFullYear();
      }
    });
    this.getCountryUserCountries();
    this.getAICountries();
  }
    yearChanged() {
    this.getAICountries();
  }

  getCountryUserCountries() {
    this.countryUserService.getCountryUserCountries().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.countries = res.result;
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


  getAICountries(currentPage: any = 1) {
    this.isLoader = true;
    let payload: AiCountrySummeryRequestDto = {
      sortDirection: SortDirection.DESC,
      sortBy: 'AIProgress',
      pageNumber: currentPage,
      pageSize: this.pageSize,
      year:this.selectedYear
    }
    if (this.userService?.userInfo?.userID == null || this.filterCountry > 0) {
      payload.countryID = this.filterCountry;
    }
    this.aiCountries = [];
    this.aiComputationService.getAICountries(payload).subscribe({
      next: (res) => {
        this.aiCountries = res.data;
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
  viewDetails(country: AiCountrySummeryDto) {
    this.selectedCountry = country;
    const sidebarEl = document.getElementById('kpiLayerSidebar');
    const offcanvas = new bootstrap.Offcanvas(sidebarEl);
    // Clear selection when sidebar closes
    sidebarEl?.addEventListener('hidden.bs.offcanvas', () => {
      this.selectedCountry = null;
      this.cdr.detectChanges();
    }, { once: true });

    offcanvas.show();
  }

  aiCountryDetailsReport(country: AiCountrySummeryDto, selectedIndex: number, format: string) {
    this.selectedIndex = selectedIndex;
    if (this.selectedIndex == -1) return;

    let payload: AiCountrySummeryRequestPdfDto = {
      countryID: country.countryID,
      year: this.selectedYear,
      format: format
    };

    this.aiComputationService.aiCountryDetailsReport(payload).subscribe({
      next: (blob) => {
        this.selectedIndex = -1;

        if (blob) {
          const url = window.URL.createObjectURL(blob);
          const link = document.createElement("a");

          const ext = format == DocumentFormat.Pdf ? 'pdf' : 'docx';

          link.href = url;
          link.download = `${country.countryName}_Details_${new Date().toISOString().split("T")[0]}.${ext}`;

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
      item.countryName?.toLowerCase().includes(term) ||
      item.countryAliasName?.toLowerCase().includes(term)
    );
}
}
