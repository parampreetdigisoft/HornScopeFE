import { Component, OnInit } from "@angular/core";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { CountryVM } from "src/app/core/models/CountryVM";
import { CommonService } from "src/app/core/services/common.service";
import { GetCountryPillarHistoryRequestDto, GetCountryPillarHistoryRequestNewDto } from "src/app/core/models/AssessmentRequest";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { MatTableDataSource } from "@angular/material/table";
import {
  PillarsHistoryResponse,
  PillarsTableRow,
  QuestionTableRow,
} from "src/app/core/models/PillarsUserHistoryResponse";
import { QuestionsByUserPillarsResponsetDto } from "src/app/core/models/GetQuestionHistoryResponseDto ";

import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTooltip, ApexLegend, ApexPlotOptions, ApexGrid, ApexStroke } from "ng-apexcharts";
import { AdminService } from "../../admin.service";
import { ExportType } from "src/app/core/enums/exportEnum";
import { ActivatedRoute } from "@angular/router";
import { buildPillarComparisonBarChartOptions } from "src/app/core/constants/pillar-comparison-bar-chart.util";

export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  dataLabels: ApexDataLabels;
  tooltip: ApexTooltip;
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  grid: ApexGrid;
  stroke: ApexStroke;
  colors: string[];
};

@Component({
  selector: "app-comparision",
  templateUrl: "./comparision.component.html",
  styleUrl: "./comparision.component.css",
})

export class ComparisionComponent implements OnInit {
  currentYear = new Date().getFullYear();
  selectedYear = new Date().getFullYear();
  pillers: PillarsVM[] = [];
  pillersHistory: PillarsHistoryResponse[] = [];
  questionsByUserPillars: QuestionsByUserPillarsResponsetDto[] = [];
  countries: CountryVM[] | null = [];
  selectedCountries: number | null = null;
  selectedPillarID: number | 'all' = 'all';
  readonly allDomainsOption = { pillarID: 'all' as const, pillarName: 'All Domains' };
  domainOptions: Array<{ pillarID: number | 'all'; pillarName: string }> = [this.allDomainsOption];
  isLoader: boolean = false;
  isPillarHistoryDownloading: boolean = false;
  dataSource = new MatTableDataSource<PillarsTableRow>([]);
  displayedColumns: string[] = []; // pillarName + dynamic users
  userMap = new Map<number, string>(); // userID -> fullName
  expandedElement: PillarsTableRow | null = null;
  questionsPillars = new MatTableDataSource<QuestionTableRow>([]);
  displayedQuestionColumns: string[] = []; // pillarName + dynamic users
  chartOptions!: Partial<ChartOptions>;
  pageSize: number = 28;
  currentPage: number = 1;
  totalRecords: number = 0;
  pillarColumns: string[] = []; // dynamic user columns
  
  constructor(
    private adminService: AdminService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
     this.route.queryParams.subscribe((params) => {
      if (params["countryID"]) {
        this.selectedCountries = +params["countryID"];
      }
    });
    this.isLoader = true;
    this.GetAllPillars();
    this.getAllCountriesByUserId();
  }

  GetAllPillars() {
    this.adminService.getAllPillars().subscribe((p) => {
      this.pillers = p;
      this.domainOptions = [this.allDomainsOption, ...p];
    });
  }
  getAllCountriesByUserId() {
    this.adminService
      .getAllCountriesByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          setTimeout(() => {
            this.isLoader = false;
          }, 1000);

          this.countries = res.result;
          if (this.countries && this.countries.length > 0) {
            this.selectedCountries = this.countries[0].countryID;
            this.getResponsesByUserId();
          }
        },
        error: () => {
          this.isLoader = false;
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

  getResponsesByUserId() {
    const userId = this.userService?.userInfo?.userID;
    const countryID = this.selectedCountries;
    if (userId == null || countryID == null) {
      return;
    }

    this.isLoader = true;
    const payload: GetCountryPillarHistoryRequestNewDto = {
      userId,
      countryID,
      pillarID: typeof this.selectedPillarID === 'number' && this.selectedPillarID > 0
        ? this.selectedPillarID
        : null,
      updatedAt: this.commonService.getStartOfYearLocal(Number(this.selectedYear)),
      pageNumber: this.currentPage,
      pageSize: this.pageSize,
    };

    this.questionsByUserPillars = [];
    this.loadPillarQuestion();
    this.adminService.getResponsesByUserId(payload).subscribe({
      next: (res) => {
        this.isLoader = false;
        this.pillersHistory = res.data ?? [];
        this.loadPillars();
        this.totalRecords = res.totalRecords ?? 0;
        this.GetPillarBarOptions();
      },
      error: () => {
        this.isLoader = false;
        this.toaster.showError("There is an error occur");
      }
    });
  }

  compareCountries(event: any) {
    this.currentPage = event;
    this.getResponsesByUserId();
  }
  
  GetPillarBarOptions() {
  const hasData = this.pillersHistory.length > 0 && this.totalRecords > 0;
  const pillarMap = new Map<number, {
    pillarName: string;
    evaluators: Map<string, {
      score: number;
      ansQuestion: number;
      totalQuestion: number;
    }>;
  }>();

  if (hasData) {
    this.pillersHistory.forEach((item: PillarsHistoryResponse) => {
      if (!pillarMap.has(item.pillarID)) {
        pillarMap.set(item.pillarID, {
          pillarName: item.pillarName,
          evaluators: new Map()
        });
      }
      const pillarEntry = pillarMap.get(item.pillarID)!;
      item.users.forEach(user => {
        pillarEntry.evaluators.set(user.fullName, {
          score: user.scoreProgress,
          ansQuestion: user.ansQuestion,
          totalQuestion: user.totalQuestion
        });
      });
    });
  } else {
    // No history — fall back to the full pillar list so the axis
    // still shows pillar names, just with no bars/values.
    (this.pillers ?? []).forEach(p => {
      pillarMap.set(p.pillarID, {
        pillarName: p.pillarName,
        evaluators: new Map()
      });
    });
  }

  const uniqueEvaluators = hasData
    ? Array.from(new Set(this.pillersHistory.flatMap(x => x.users).map(x => x.fullName)))
    : [];

  const categories = Array.from(pillarMap.values()).map(p => p.pillarName);

  // Empty series when there's no data — keeps the chart rendered but blank
  const series: ApexAxisChartSeries = hasData
    ? uniqueEvaluators.map(evaluator => ({
        name: evaluator,
        data: Array.from(pillarMap.values()).map(pillar => {
          const evaluatorData = pillar.evaluators.get(evaluator);
          return evaluatorData ? evaluatorData.score : 0;
        })
      }))
    : [{
        name: 'No Data',
        data: categories.map(() => 0)
      }];

  const tooltipData = Array.from(pillarMap.entries()).map(([pillarID, pillar]) => ({
    pillarName: pillar.pillarName,
    evaluators: Object.fromEntries(pillar.evaluators)
  }));

  this.chartOptions = buildPillarComparisonBarChartOptions({
    series : series ?? [],
    categories,
    hasData,
    uniqueEvaluators,
    tooltipData,
    colors: (this.commonService.PillarColors ?? []).slice(0, Math.max(uniqueEvaluators.length, 1)),
  });
}

  loadPillars() {
    this.userMap = new Map<number, string>();
    this.pillersHistory.forEach((pillar) => {
      pillar.users.forEach((u) => this.userMap.set(u.userID, u.fullName));
    });

    // Use userID as column keys
    this.pillarColumns = Array.from(this.userMap.keys()).map((id) =>
      id.toString()
    );
    this.displayedColumns = ["pillarName", ...this.pillarColumns];

    let data = this.pillersHistory.map((pillar) => {
      const row: PillarsTableRow = {
        pillarName: pillar.pillarName,
        pillarID: pillar.pillarID,
      };

      // Fill all users with default "0"
      this.userMap.forEach((_, userID) => {
        row[userID] = "0";
      });

      // Overwrite existing users with their scoreProgress
      pillar.users.forEach((u) => {
        row[u.userID] = u.scoreProgress?.toFixed(2);
      });

      return row;
    });
    this.dataSource = new MatTableDataSource<PillarsTableRow>(data);
  }

  loadPillarQuestion() {
    const data = this.questionsByUserPillars.map((question) => {
      const row: QuestionTableRow = {
        question: question.questionText,
      };
      // Fill all users with default values
      this.userMap.forEach((userID) => {
        row[userID] = {
          score: null,
          justification: null,
          optionText: null,
        };
      });

      // Overwrite only existing users
      question.users.forEach((u) => {
        row[u.userID] = {
          score: u.score,
          justification: u.justification,
          optionText: u.optionText,
        };
      });
      return row;
    });

    this.displayedQuestionColumns = ["question", ...this.pillarColumns]; // final columns for table

    this.questionsPillars = new MatTableDataSource<QuestionTableRow>(data);
  }

  getQuestionsHistoryByPillar(pillarID: number) {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedCountries ||
      this.selectedCountries == null
    ) {
      return;
    }

    let payload: GetCountryPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      pillarID: pillarID,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
      exportType:ExportType.Excel
    };
    this.questionsByUserPillars = [];
    this.loadPillarQuestion();
    this.adminService.getQuestionsHistoryByPillar(payload).subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.questionsByUserPillars = res.result ?? [];
          this.loadPillarQuestion();
        } else {
          this.toaster.showError(res.errors.join(", "));
        }
      },
      error: () => {
        this.toaster.showError("There is an error please try later");
      },
    });
  }

  exportPillarsHistoryByUserId() {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedCountries ||
      this.selectedCountries == null || this.pillarColumns?.length == 0
    ) {
      return;
    }
    this.isPillarHistoryDownloading = true;
    let payload: GetCountryPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      countryID: this.selectedCountries,
      updatedAt: this.commonService.getStartOfYearLocal(this.selectedYear),
      exportType:ExportType.Excel
    };
    if (typeof this.selectedPillarID === 'number' && this.selectedPillarID > 0) {
      payload.pillarID = this.selectedPillarID;
    }
    this.adminService.exportPillarsHistoryByUserId(payload).subscribe({
      next: (res) => {
        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = "PillarQuestionHistory.xlsx";
        a.click();
        this.isPillarHistoryDownloading = false;
        this.toaster.showSuccess("Domains History downloaded successfully");
      },
      error: () => {
        this.isPillarHistoryDownloading = false;
        this.toaster.showError("There is an error please try later");
      },
    });
  }
  toggleRow(element: any) {
    this.expandedElement = this.expandedElement === element ? null : element;
    if (this.expandedElement) {
      this.getQuestionsHistoryByPillar(element.pillarID);
    }
  }
}
