import { Component, inject, Input, OnChanges, Output, SimpleChanges, ViewChild } from '@angular/core';
import { AiCountrySummeryDto } from 'src/app/core/models/aiVm/AiCountrySummeryDto';
import { environment } from 'src/environments/environment';

import { buildCountryScoreRadialOptions } from 'src/app/core/constants/country-score-radial.util';
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ChartComponent,
  ApexLegend,
  ApexStates,
  ApexTooltip
} from "ng-apexcharts";
import { CommonModule } from '@angular/common';
import { TypingTextComponent } from 'src/app/shared/standAlone/typing-text/typing-text.component';
import { SharedModule } from 'src/app/shared/share.module';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { SparklineScoreComponent } from 'src/app/shared/standAlone/sparkline-score/sparkline-score.component';
import { Router } from '@angular/router';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UserService } from 'src/app/core/services/user.service';

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  colors: string[];
  legend: ApexLegend;
  plotOptions: ApexPlotOptions;
  states: ApexStates;
  tooltip: ApexTooltip;
};

@Component({
  selector: 'app-view-country-detail',
  standalone: true,
  imports: [CommonModule, TypingTextComponent, SharedModule, CircularScoreComponent, SparklineScoreComponent,MatTooltipModule],
  templateUrl: './view-country-detail.component.html',
  styleUrl: './view-country-detail.component.css'
})
export class ViewCountryDetailComponent implements OnChanges {
  @Input() country?: AiCountrySummeryDto | null = null;
  @Output() closeSidebar?: boolean | null = null;
  urlBase = environment.apiUrl;
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;

  router = inject(Router);
  userService = inject(UserService);

  onImgError(event: Event) {
    (event.target as HTMLImageElement).src = 'assets/images/Frame 1321315029.png';
  }

  ngOnChanges(changes: SimpleChanges): void {
    this.ApexGetPieOptions();
  }

  viewPillars() {
    this.router.navigate([`/${this.userService.userInfo?.role?.toLowerCase()}/ai/kpi-analysis`], {
      queryParams: {
        countryID: this.country?.countryID,
      }
    });
  }

  ApexGetPieOptions() {
    const aiProgress = this.country?.aiProgress ?? 0;
    const evaluatorProgress = this.country?.evaluatorScore ?? 0;
    const discrepancy = this.country?.discrepancy ?? 0;
    const avgProgress = (aiProgress + evaluatorProgress) / 2;

    this.chartOptions = buildCountryScoreRadialOptions({
      ai: aiProgress,
      evaluator: evaluatorProgress,
      discrepancy,
      avg: avgProgress
    });
  }
}
