import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexMarkers, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import { AiCrossProgramResponseDto, ChartTableRowDto, PillarValueDto, PillarWiseScoreDto } from 'src/app/core/models/aiVm/AiCrossProgramResponseDto';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CommonService } from 'src/app/core/services/common.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from 'src/app/shared/share.module';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { environment } from 'src/environments/environment';
import { ProgramVM } from 'src/app/core/models/ProgramVM';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { AdminService } from '../../admin.service';
import { UserService } from 'src/app/core/services/user.service';
import { ChatService } from 'src/app/core/services/chat.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { Router } from '@angular/router';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';
import { buildAiProgramRadarChartOptions } from 'src/app/core/constants/ai-program-radar-chart.util';
export type ChartOptions = {
  series: ApexAxisChartSeries;
  chart: ApexChart;
  xaxis: ApexXAxis;
  yaxis: ApexYAxis;
  stroke: ApexStroke;
  tooltip: ApexTooltip;
  dataLabels: ApexDataLabels;
  markers: ApexMarkers;
  legend: ApexLegend;
  grid: ApexGrid;
  colors: string[];
  fill: any;
  plotOptions: any;
  responsive: any;
};
@Component({
  selector: 'app-ai-program-comparison',
  standalone: true,
  imports: [CommonModule, SharedModule, CircularScoreComponent,UtcToLocalTooltipDirective],
  templateUrl: './ai-program-comparison.component.html',
  styleUrls: ['./ai-program-comparison.component.css'],
})
export class AiProgramComparisonComponent implements OnInit {
  pillars: PillarsVM[] = [];
  filterPillars: PillarsVM[] = [];
  selectedPillars: number[] = [];
  selectedPrograms: number[] = [];
  programs: ProgramVM[] | null = [];
  @ViewChild("chart") chart!: ChartComponent;
  public radarChartOptions: Partial<ChartOptions> = {};
  compareProgramResponseDto: AiCrossProgramResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $pillarChanged = new Subject();
  pillarWiseData: PillarWiseScoreDto[] = [];
  maxProgram?: ChartTableRowDto;
  highestPillar?: PillarValueDto;
  lowestPillar?: PillarValueDto;
  avgScore?: number;
  showLimitMessage:boolean= false;
  constructor(
    private adminService: AdminService,
    private userService: UserService,
    private toaster: ToasterService,
    private aiComputationService: AiComputationService,
    public commonService: CommonService,
    private chatService:ChatService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.GetAllKpi();
    this.getProgramUserPrograms();
    this.$pillarChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.comparePrograms();
    });
  }

  pillarChanged() {
    this.$pillarChanged.next(true);
    if (this.selectedPrograms.length > 5) {
      // Remove the last selected program to prevent selecting more than 6
      this.selectedPrograms = this.selectedPrograms.slice(0, 6);
      this.showLimitMessage = true;
      return;
    }
    this.showLimitMessage = false;
  }
  getPillarName(pillarId: number): string {
    return this.filterPillars.find(p => p.pillarID === pillarId)?.pillarName ?? '';
  }

  GetAllKpi() {
    this.adminService.getAllPillars().subscribe({
      next: (res) => {
        this.pillars = res ?? [];
        this.filterPillars = [...this.pillars];
      }
    });
  }
  getProgramUserPrograms() {
    this.adminService.getAllProgramsByUserId(this.userService.userInfo.userID).subscribe((p) => {
      this.isLoader = false;
      this.programs = p.result || [];
      if (this.programs?.length && this.selectedPrograms.length < 2) {
        this.selectedPrograms = this.programs.slice(0, 2).map(x => x.climateProgramID);
        this.comparePrograms();
      }
    });
  }

  comparePrograms() {
    if (this.selectedPrograms.length < 1) {
      this.compareProgramResponseDto = null;
      this.getRadarChartOptions();
      this.toaster.showWarning("Please select at least one program to view data.");
      return;
    }
    this.isLoader = true;
    this.aiComputationService.getAICrossProgramPillars(this.selectedPrograms).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.compareProgramResponseDto = res.result || null;
          this.chartTableData = this.compareProgramResponseDto?.tableData ?? [];
          this.getTablePillarWiseData();
          this.getRadarChartOptions();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected programs.");
        }
      },
      error: (err) => {
        this.isLoader = false;
        this.toaster.showError("Failed to load comparison data.");
      }
    });
  }
  getTablePillarWiseData() {
    this.pillarWiseData = [];
    let tableData = this.compareProgramResponseDto?.tableData ?? [];

    tableData.forEach(program => {
      program.pillarValues.forEach(pillar => {
        let existingPillar = this.pillarWiseData.find(p => p.pillarID === pillar.pillarID);

        if (!existingPillar) {
          existingPillar = {
            pillarID: pillar.pillarID,
            pillarName: pillar.pillarName,
            displayOrder: pillar.displayOrder,
            isAccess: pillar.isAccess,
            imagePath: this.pillars.find(p => p.pillarID === pillar.pillarID)?.imagePath || '',
            values: []
          };
          this.pillarWiseData.push(existingPillar);
        }

        existingPillar.values.push({
          climateProgramID: program.climateProgramID,
          programName: program.programName,
          value: pillar.value
        });
      });
    });
    this.filterPillars = this.pillars.filter(p => this.pillarWiseData.some(pw => pw.pillarID === p.pillarID && pw.isAccess));
    this.calculatePillarCards();
  }

  getRadarChartOptions() {
    // Enhanced color palette with better contrast and visual appeal
    const colorPalette = this.commonService.radarColors;

    // Prepare series data for radar chart
    const series: any[] = [];
    let categories: string[] = [];

    if (this.selectedPillars.length > 0) {
      let pillarSequece = this.chartTableData.at(0)?.pillarValues.filter(x => x.isAccess).map(x => x.pillarID) || [];
      const indexes = pillarSequece
        .map((pillarID, idx) => this.selectedPillars.includes(pillarID) ? idx : -1)
        .filter(idx => idx !== -1);

      categories = this.compareProgramResponseDto?.categories.filter((_, idx) => indexes.includes(idx)).map(cat => cat) || [];


      (this.compareProgramResponseDto?.series ?? []).forEach((programData, index) => {

        series.push({
          name: programData.name,
          data: programData.data.filter((_, idx) => indexes.includes(idx))
        });
      });

    } else {
      categories = this.compareProgramResponseDto?.categories || [];
      (this.compareProgramResponseDto?.series ?? []).forEach((programData, index) => {

        series.push({
          name: programData.name,
          data: programData.data
        });
      });
    }
        this.radarChartOptions = buildAiProgramRadarChartOptions({
      series,
      categories,
      colorPalette,
      tooltipSeries: series,
      tooltipCategoryLabels: categories,
    });
  }

  getProgramScore(climateProgramID: number, isAi: boolean = false): string {
    const program = this.programs?.find(c => c.climateProgramID === climateProgramID);
    if (isAi) {
      return program?.aiScore?.toFixed(2) || '0';
    }
    return program?.score?.toFixed(2) || '0';
  }

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  customSearchFn(term: string, item: any) {
    term = term.toLowerCase();
    return (
      item.layerCode?.toLowerCase().includes(term) ||
      item.layerName?.toLowerCase().includes(term)
    );
  }
  private calculatePillarCards(): void {
    if (!this.chartTableData?.length) return;

    /* MAX CITY */
    this.maxProgram = [...this.chartTableData]
      .sort((a, b) => a.value - b.value)
      .pop();

    let pillarValues = this.chartTableData.flatMap(x => x.pillarValues).filter(x => x.isAccess);
    /* HIGHEST PILLAR */
    this.highestPillar = pillarValues.reduce((max, curr) => curr.value > max.value ? curr : max);
    if (this.highestPillar) {
      let image = this.pillars.find(p => p.pillarID === this.highestPillar?.pillarID)?.imagePath || '';
      this.highestPillar.imagePath = image;
    }

    /* LOWEST PILLAR */
    this.lowestPillar = pillarValues.reduce((min, curr) => curr.value < min.value ? curr : min);
    if (this.lowestPillar) {
      let image = this.pillars.find(p => p.pillarID === this.lowestPillar?.pillarID)?.imagePath || '';
      this.lowestPillar.imagePath = image;
    }

    /* AVERAGE */
    let avg = pillarValues.reduce((a, b) => a + b.value, 0) / pillarValues.length;
    this.avgScore = Math.round(avg * 100) / 100;
  }

  calculatePillarAvg(id: number): string {
    if (!this.chartTableData?.length) return 'NA';

    let pillarValues = this.chartTableData.flatMap(x => x.pillarValues).filter(x => x.isAccess && x.pillarID == id);

    if (pillarValues.length == 0) return 'NA';
    /* AVERAGE */
    let avg = pillarValues.reduce((a, b) => a + b.value, 0) / pillarValues.length;
    return Math.round(avg * 100) / 100 + '';
  }

  viewVCPAveumCrossComparision(){
    this.chatService.crossComparisionprogramIDs.next(this.selectedPrograms);
    this.router.navigate(['/admin/aevum'], { state: { role: UserRole.Admin } });
  }
}
