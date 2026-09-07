import { Component, OnInit, ViewChild } from '@angular/core';
import { GetProgramQuestionHistoryResponseDto, UserProgramRequestDto } from 'src/app/core/models/ProgramHistoryDto';
import { CommonService } from 'src/app/core/services/common.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { UserService } from 'src/app/core/services/user.service';
import { ClientService } from '../../client.service';
import { ProgramDetailsDto, ProgramPillarDetailsDto } from '../../models/ProgramDetailsDto';
import { UserDataShareService } from '../../user-data-share.service';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { PillarsTableRow } from 'src/app/core/models/PillarsUserHistoryResponse';
import { MatTableDataSource } from '@angular/material/table';
import { StaffProgramGetPillarInfoRequestDto } from '../../models/StaffProgramGetPillarInfoRequestDto';
import { ProgramPillarQuestionDetailsDto } from '../../models/ProgramPillarQuestionDetailsDto';
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
  selector: 'app-program-details',
  templateUrl: './program-details.component.html',
  styleUrl: './program-details.component.css'
})
export class ProgramDetailsComponent implements OnInit {

  programDetail: ProgramDetailsDto | null = null;
  program: ProgramVM | null = null;

  urlBase = environment.apiUrl;
  programQuestionHistoryReponse: GetProgramQuestionHistoryResponseDto | null = null;
  isLoader: boolean = false;
  resizeTimeout: any;
  dataSource = new MatTableDataSource<ProgramPillarDetailsDto>([]);
  displayedColumns: string[] = ["pillarName", "totalScore", "scoreProgress", "totalAnsPillar", "ansQuestion", "highLowerScore", "totalUnKnown", "totalNA"];

  // dynamic user columns
  userMap = new Map<number, string>(); // userID -> fullName
  expandedElement: PillarsTableRow | null = null;
  questionsPillars = new MatTableDataSource<ProgramPillarQuestionDetailsDto>([]);
  displayedQuestionColumns: string[] = ["questionText", "totalScore", "scoreProgress", "ansQuestion", "highLowerScore", "totalUnKnown", "totalNA"];

  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  constructor(private clientService: ClientService, private toaster: ToasterService, private userService: UserService,
    public commonService: CommonService, private userDataService: UserDataShareService, private router: Router) { }

  ngOnInit(): void {
    this.program = this.userDataService.program();
    if (this.program) {
      this.getprogramDetails();
    }
    else {
      this.router.navigate(['programuser/program-view']);
    }
  }
  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }
  getprogramDetails() {
    this.isLoader = true;
    let request: UserProgramRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      climateProgramID: this.program?.climateProgramID ?? 0
    }
    this.clientService.getProgramDetails(request).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.programDetail = res.result;
          if (this.programDetail?.pillars) {
            this.GetApexPillarRadialBarOptions(this.programDetail.pillars)
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

  getprogramPillarDetails(pillarID: number) {
    let request: StaffProgramGetPillarInfoRequestDto = {
      userID: this.userService?.userInfo?.userID ?? 0,
      climateProgramID: this.program?.climateProgramID ?? 0,
      pillarID: pillarID
    }
    this.clientService.getProgramPillarDetails(request).subscribe({
      next: (res) => {
        if (res.succeeded) {
          if (res.result) {
            this.questionsPillars = new MatTableDataSource<ProgramPillarQuestionDetailsDto>(res.result);
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
      this.getprogramPillarDetails(element.pillarID);
    }
  }

  setPillarDataSource() {
    if (this.programDetail?.pillars) {
      this.dataSource = new MatTableDataSource<ProgramPillarDetailsDto>(this.programDetail?.pillars);
    }
  }

  GetApexPillarRadialBarOptions(history: ProgramPillarDetailsDto[]) {
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
              label: "Avg Pillar Score",
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
