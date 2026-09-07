import { Component, OnInit, ViewChild } from '@angular/core';
import { GetCountryQuestionHistoryResponseDto, UserCountryRequestDto } from 'src/app/core/models/countryHistoryDto';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { CountryUserService } from '../../country-user.service';
import { CountryDetailsDto, CountryPillarDetailsDto } from '../../models/CountryDetailsDto';
import { UserDataShareService } from '../../user-data-share.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { Router } from '@angular/router';
import { AgPieSeriesOptions } from 'ag-charts-community';
import { environment } from 'src/environments/environment';
import { PillarsTableRow, QuestionTableRow } from 'src/app/core/models/PillarsUserHistoryResponse';
import { MatTableDataSource } from '@angular/material/table';
import { UserCountryGetPillarInfoRequestDto } from '../../models/UserCountryGetPillarInfoRequestDto';
import { CountryPillarQuestionDetailsDto } from '../../models/CountryPillarQuestionDetailsDto';
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexLegend,
  ChartComponent,
  ApexTooltip
} from "ng-apexcharts";

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  tooltip: ApexTooltip;
  plotOptions: ApexPlotOptions;

};

@Component({
  selector: 'app-country-details',
  templateUrl: './country-details.component.html',
  styleUrl: './country-details.component.css'
})
export class CountryDetailsComponent implements OnInit {

  countryDetail: CountryDetailsDto | null = null;
  country: CountryVM | null = null;
  currentYear = new Date().getFullYear();
  selectedYear = new Date().getFullYear();

  urlBase = environment.apiUrl;
  countryQuestionHistoryReponse: GetCountryQuestionHistoryResponseDto | null = null;
  isLoader: boolean = false;
  resizeTimeout: any;
  dataSource = new MatTableDataSource<CountryPillarDetailsDto>([]);
  displayedColumns: string[] = ["pillarName", "totalScore", "scoreProgress", "totalAnsPillar", "ansQuestion", "highLowerScore", "totalUnKnown", "totalNA"];

  // dynamic user columns
  userMap = new Map<number, string>(); // userID -> fullName
  expandedElement: PillarsTableRow | null = null;
  questionsPillars = new MatTableDataSource<CountryPillarQuestionDetailsDto>([]);
  displayedQuestionColumns: string[] = ["questionText", "totalScore", "scoreProgress", "ansQuestion", "highLowerScore", "totalUnKnown", "totalNA"];

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  constructor(private countryUserService: CountryUserService, private toaster: ToasterService, private userService: UserService,
    public commonService: CommonService, private userDataService: UserDataShareService, private router: Router) { }

  ngOnInit(): void {
    this.country = this.userDataService.country();
    if (this.country) {
      this.getcountryDetails();
    }
    else {
      this.router.navigate(['countryuser/country-view']);
    }
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }
  getcountryDetails() {
    this.isLoader = true;
    let request: UserCountryRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.country?.countryID ?? 0,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear)
    }
    this.countryUserService.getCountryDetails(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.countryDetail = res.result;
          if (this.countryDetail?.pillars) {
            this.GetApexPillarRadialBarOptions(this.countryDetail.pillars)
            this.setPillarDataSource();
          }
        }
        else {
          this.isLoader = false;
          this.toaster.showError(this.toaster.tryAgain);
        }
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError(this.toaster.tryLater)
      }
    });
  }
  getcountryPillarDetails(pillarID: number) {
    let request: UserCountryGetPillarInfoRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      countryID: this.country?.countryID ?? 0,
      pillarID: pillarID,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear)
    }
    this.countryUserService.getCountryPillarDetails(request).subscribe({
      next: (res) => {
        if (res.succeeded) {
          if (res.result) {
            this.questionsPillars = new MatTableDataSource<CountryPillarQuestionDetailsDto>(res.result);
          }
        }
        else {
          this.toaster.showError(this.toaster.tryAgain);
        }
      },
      error: () => this.toaster.showError(this.toaster.tryLater)
    });
  }

  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
    if (this.expandedElement) {
      this.getcountryPillarDetails(element.pillarID);
    }
  }

  setPillarDataSource() {
    if (this.countryDetail?.pillars) {
      this.dataSource = new MatTableDataSource<CountryPillarDetailsDto>(this.countryDetail?.pillars);
    }
  }

  GetApexPillarRadialBarOptions(history: CountryPillarDetailsDto[]) {
    const colors = this.commonService.PillarColors;
    const filterData = history.filter(x => x.isAccess).sort((x: any, y: any) => y.scoreProgress - x.scoreProgress);
    // Convert to Apex series + labels format
    const series = filterData.map(h =>
      h.scoreProgress === 0 ? 5.03 : Number(h.scoreProgress.toFixed(1))
    );

    const labels = filterData.map(h => h.pillarName);

    this.chartOptions = {
      series: series,

      chart: {
        height: 380,
        type: "radialBar",
        toolbar: { show: false }
      },

      colors: colors,

      plotOptions: {
        radialBar: {
          startAngle: 0,
          endAngle: 300,
          offsetY: 20,
          offsetX: 5,

          hollow: {
            size: "40%",
            background: "#25453f0d"
          },

          track: {
            background: "#f1f1f1",
            strokeWidth: "100%",
          },

          dataLabels: {
            show: true,
            name: {
              show: true,
              fontSize: "14px",
              offsetY: -10,
            },
            value: {
              show: true,
              offsetY: 10,
              formatter: (opts: number) => {
                return `${opts}`;
              }
            },
            total: {
              show: true,
              label: "Avg Domain Score",
              formatter: () => {
                const avg =
                  history.reduce((sum, item) => sum + item.scoreProgress, 0) /
                  history.length;
                return `${avg.toFixed(1)}`;
              }
            }
          }
        }
      },
      labels: labels,
    };
  }
}
