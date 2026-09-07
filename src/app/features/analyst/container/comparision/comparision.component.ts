import { Component, OnInit } from "@angular/core";
import { ToasterService } from "src/app/core/services/toaster.service";
import { UserService } from "src/app/core/services/user.service";
import { ProgramVM } from "src/app/core/models/ProgramVM";
import { CommonService } from "src/app/core/services/common.service";
import { GetProgramPillarHistoryRequestDto, GetProgramPillarHistoryRequestNewDto } from "src/app/core/models/AssessmentRequest";
import { PillarsVM } from "src/app/core/models/PillersVM";
import { MatTableDataSource } from "@angular/material/table";
import {
  PillarsHistoryResponse,
  PillarsTableRow,
  QuestionTableRow,
} from "src/app/core/models/PillarsUserHistoryResponse";
import { QuestionsByUserPillarsResponsetDto } from "src/app/core/models/GetQuestionHistoryResponseDto ";
import { AnalystService } from "../../analyst.service";
import { ApexAxisChartSeries, ApexChart, ApexXAxis, ApexYAxis, ApexDataLabels, ApexTooltip, ApexLegend, ApexPlotOptions, ApexGrid, ApexStroke } from "ng-apexcharts";
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
  styleUrls: ["../../../../shared/styles/assessment-comparison.shared.css"],
})

export class ComparisionComponent implements OnInit {
  pillers: PillarsVM[] = [];
  filterProgram!: number;
  pillersHistory: PillarsHistoryResponse[] = [];
  questionsByUserPillars: QuestionsByUserPillarsResponsetDto[] = [];
  programs: ProgramVM[] | null = [];
  selectedPrograms: number | any = "";
  selectedPillarID: number | any = "";
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
  // Columns for mat-table
  pillarColumns: string[] = []; // dynamic user columns

  constructor(
    private analystService: AnalystService,
    private toaster: ToasterService,
    private userService: UserService,
    public commonService: CommonService,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.GetAllPillars();
    this.getAllProgramsByUserId();
    //this.initializeChart();
    this.route.queryParams.subscribe((params) => {
      if (params["climateProgramID"]) {
        this.filterProgram = +params["climateProgramID"];
      }
    });
  }

  GetAllPillars() {
    this.analystService.getAllPillars().subscribe((p) => {
      this.pillers = p;
    });
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.programName?.toLowerCase().includes(term) ||
      item.location?.toLowerCase().includes(term) ||
      item.year?.toString().toLowerCase().includes(term)
    );
  }

  getAllProgramsByUserId() {
    this.analystService
      .getAllProgramsByUserId(this.userService?.userInfo?.userID)
      .subscribe({
        next: (res) => {
          setTimeout(() => {
            this.isLoader = false;
          }, 1000);

          this.programs = res.result;
          if (this.programs && this.programs.length > 0) {
            this.selectedPrograms = this.programs[0].climateProgramID;
            this.filterProgram = this.programs[0].climateProgramID;
            this.getResponsesByUserId();
          }
        },
        error: () => {
          this.isLoader = false;
        }
      });
  }

  getResponsesByUserId() {
    if (
      this.userService?.userInfo?.userID == null ||
      !this.selectedPrograms ||
      this.selectedPrograms === "" ||
      this.selectedPrograms == null
    ) {
      return;
    }

    this.isLoader = true;
    let payload: GetProgramPillarHistoryRequestNewDto = {
      userId: this.userService?.userInfo?.userID,
      pillarID:
        this.selectedPillarID && this.selectedPillarID > 0
          ? this.selectedPillarID
          : null,
      pageNumber: this.currentPage,
      pageSize: this.pageSize
    }
    if (this.userService?.userInfo?.userID == null || this.filterProgram > 0) {
      payload.climateProgramID = this.filterProgram;
    };
    this.questionsByUserPillars = [];
    this.loadPillarQuestion();
    this.analystService.getResponsesByUserId(payload).subscribe({
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

  comparePrograms(event: any) {
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
    // No history â€” fall back to the full pillar list so the axis
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

  // Empty series when there's no data â€” keeps the chart rendered but blank
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

      // Overwrite existing users with their score
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
      !this.selectedPrograms ||
      this.selectedPrograms === "" ||
      this.selectedPrograms == null
    ) {
      return;
    }

    let payload: GetProgramPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      pillarID: pillarID,
      climateProgramID: this.selectedPrograms,
      exportType:ExportType.Excel
    };
    this.questionsByUserPillars = [];
    this.loadPillarQuestion();
    this.analystService.getQuestionsHistoryByPillar(payload).subscribe({
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
      !this.selectedPrograms ||
      this.selectedPrograms === "" ||
      this.selectedPrograms == null || this.pillarColumns?.length == 0
    ) {
      return;
    }
    this.isPillarHistoryDownloading = true;
    let payload: GetProgramPillarHistoryRequestDto = {
      userID: this.userService?.userInfo?.userID,
      climateProgramID: this.selectedPrograms,
      exportType:ExportType.Excel
    };
    if (this.selectedPillarID) {
      payload.pillarID = this.selectedPillarID;
    }
    this.analystService.exportPillarsHistoryByUserId(payload).subscribe({
      next: (res) => {
        const url = window.URL.createObjectURL(res);
        const a = document.createElement("a");
        a.href = url;
        a.download = "PillarQuestionHistory.xlsx";
        a.click();
        this.isPillarHistoryDownloading = false;
        this.toaster.showSuccess("Pillars History downloaded successfully");
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
