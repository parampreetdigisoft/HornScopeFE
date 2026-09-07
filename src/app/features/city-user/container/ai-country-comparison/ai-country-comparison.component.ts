import { ApexAxisChartSeries, ApexChart, ApexDataLabels, ApexGrid, ApexLegend, ApexMarkers, ApexStroke, ApexTooltip, ApexXAxis, ApexYAxis, ChartComponent } from 'ng-apexcharts';
import { AiCrossCountryResponseDto, ChartTableRowDto, PillarValueDto, PillarWiseScoreDto } from 'src/app/core/models/aiVm/AiCrossCountryResponseDto';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';
import { AiComputationService } from 'src/app/core/services/ai-computation.service';
import { ToasterService } from 'src/app/core/services/toaster.service';
import { CommonService } from 'src/app/core/services/common.service';
import { Component, OnInit, ViewChild } from '@angular/core';
import { SharedModule } from 'src/app/shared/share.module';
import { PillarsVM } from 'src/app/core/models/PillersVM';
import { environment } from 'src/environments/environment';
import { CountryUserService } from '../../country-user.service';
import { CountryVM } from 'src/app/core/models/CountryVM';
import { CommonModule } from '@angular/common';
import { debounceTime, Subject } from 'rxjs';
import { Router } from '@angular/router';
import { ChatService } from 'src/app/core/services/chat.service';
import { UserRole } from 'src/app/core/enums/UserRole';
import { UtcToLocalTooltipDirective } from 'src/app/shared/directives/utc-to-local-tooltip.directive';
import { SelectOverflowLabelComponent } from 'src/app/shared/standAlone/select-overflow-label/select-overflow-label.component';
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
  selector: 'app-ai-country-comparison',
  standalone: true,
  imports: [CommonModule, SharedModule, CircularScoreComponent, UtcToLocalTooltipDirective, SelectOverflowLabelComponent],
  templateUrl: './ai-country-comparison.component.html',
  styleUrl: './ai-country-comparison.component.css'
})
export class AiCountryComparisonComponent implements OnInit {
  pillars: PillarsVM[] = [];
  filterPillars: PillarsVM[] = [];
  selectedPillars: number[] = [];
  selectedCountries: number[] = [];
  countries: CountryVM[] | null = [];
  @ViewChild("chart") chart!: ChartComponent;
  public radarChartOptions: Partial<ChartOptions> = {};
  compareCountryResponseDto: AiCrossCountryResponseDto | null = null;
  isLoader: boolean = false;
  environment = environment.apiUrl;
  chartTableData: ChartTableRowDto[] = [];
  $pillarChanged = new Subject();
  pillarWiseData: PillarWiseScoreDto[] = [];
  maxCountry?: ChartTableRowDto;
  highestPillar?: PillarValueDto;
  lowestPillar?: PillarValueDto;
  avgScore?: number;

  constructor(
    private countryUserService: CountryUserService,
    private toaster: ToasterService,
    private aiComputationService: AiComputationService,
    public commonService: CommonService,
        private chatService:ChatService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.isLoader = true;
    this.GetAllKpi();
    this.getCountryUserCountries();
    this.$pillarChanged.pipe(debounceTime(1000)).subscribe(x => {
      this.compareCountries();
    });
  }

  pillarChanged() {
    this.$pillarChanged.next(true);
  }
  getPillarName(pillarId: number): string {
    return this.filterPillars.find(p => p.pillarID === pillarId)?.pillarName ?? '';
  }

  get selectedPillarNames(): string[] {
    return this.selectedPillars.map((id) => this.getPillarName(id)).filter(Boolean);
  }

  get selectedCountryNames(): string[] {
    return this.selectedCountries
      .map((id) => this.countries?.find((country) => country.countryID === id)?.countryName ?? '')
      .filter(Boolean);
  }

  GetAllKpi() {
    this.countryUserService.getAllPillars().subscribe({
      next: (res) => {
        if (res.succeeded) {
          this.pillars = res.result ?? [];
          this.filterPillars = [...this.pillars];
        }
      }
    });
  }
  getCountryUserCountries() {
    this.countryUserService.getCountryUserCountries().subscribe((p) => {
      this.isLoader = false;
      this.countries = p.result || [];
      if (this.countries?.length && this.selectedCountries.length < 2) {
        this.selectedCountries = this.countries.slice(0, 2).map(x => x.countryID);
        this.compareCountries();
      }
    });
  }

  compareCountries() {
    if (this.selectedCountries.length < 1) {
      this.compareCountryResponseDto = null;
      this.getRadarChartOptions();
      this.toaster.showWarning("Please select at least one country to view data.");
      return;
    }
    this.isLoader = true;
    this.aiComputationService.getAICrossCountryPillars(this.selectedCountries).subscribe({
      next: (res) => {
        this.isLoader = false;
        if (res.succeeded) {
          this.compareCountryResponseDto = res.result || null;
          this.chartTableData = this.compareCountryResponseDto?.tableData ?? [];
          this.getTablePillarWiseData();
          this.getRadarChartOptions();
        }
        else {
          this.toaster.showInfo("No comparison data available for the selected countries.");
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
    let tableData = this.compareCountryResponseDto?.tableData ?? [];

    tableData.forEach(country => {
      country.pillarValues.forEach(pillar => {
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
          countryID: country.countryID,
          countryName: country.countryName,
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

      categories = this.compareCountryResponseDto?.categories.filter((_, idx) => indexes.includes(idx)).map(cat => cat) || [];


      (this.compareCountryResponseDto?.series ?? []).forEach((countryData, index) => {

        series.push({
          name: countryData.name,
          data: countryData.data.filter((_, idx) => indexes.includes(idx))
        });
      });

    } else {
      categories = this.compareCountryResponseDto?.categories || [];
      (this.compareCountryResponseDto?.series ?? []).forEach((countryData, index) => {

        series.push({
          name: countryData.name,
          data: countryData.data
        });
      });
    }
    // Radar chart options with enhanced styling
    const radarOptions: Partial<ChartOptions> = {
      series: series,
      chart: {
        height: 500,
        type: 'radar',
        toolbar: {
          show: true,
          tools: {
            download: true,
            zoom: false,
            zoomin: false,
            zoomout: false,
            pan: false,
            reset: true
          },
          export: {
            csv: {
              filename: 'cross-city-comparison',
              headerCategory: 'Category',
            },
            svg: {
              filename: 'cross-city-radar'
            },
            png: {
              filename: 'cross-city-radar'
            }
          }
        },
        animations: {
          enabled: true,
          easing: 'easeinout',
          speed: 1000,
          animateGradually: {
            enabled: true,
            delay: 150
          },
          dynamicAnimation: {
            enabled: true,
            speed: 350
          }
        },
        dropShadow: {
          enabled: true,
          blur: 8,
          left: 0,
          top: 0,
          opacity: 0.15
        },
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif',
        background: 'transparent',
        foreColor: '#EFE7D6'
      },
      colors: colorPalette.map(c => c.primary),
      stroke: {
        show: true,
        width: 2.5,
        colors: colorPalette.map(c => c.primary),
        dashArray: 0
      },
      fill: {
        opacity: 0.25,
        type: 'gradient',
        gradient: {
          shade: 'dark',
          type: 'horizontal',
          shadeIntensity: 0.5,
          gradientToColors: colorPalette.map(c => c.light),
          inverseColors: false,
          opacityFrom: 0.4,
          opacityTo: 0.15,
          stops: [0, 100]
        }
      },
      markers: {
        size: 5,
        strokeWidth: 2,
        strokeColors: '#141209',
        colors: colorPalette.map(c => c.primary),
        hover: {
          size: 10,
          sizeOffset: 2
        },
        discrete: []
      },
      xaxis: {
        categories: categories,
        labels: {
          show: true,
          style: {
            colors: Array(categories?.length).fill('#9C9484'),
            fontSize: '12px',
            fontWeight: 600,
            fontFamily: 'Inter, system-ui, sans-serif'
          },
          formatter: (value: string) => {
            // Truncate long category names
            return value.length > 15 ? value.substring(0, 15) + '...' : value;
          }
        }
      },
      yaxis: {
        show: true,
        min: 0,
        max: 100,
        tickAmount: 5,
        labels: {
          show: true,
          style: {
            colors: '#9C9484',
            fontSize: '11px',
            fontWeight: 500
          },
          formatter: (val: number) => `${val.toFixed(0)}`
        }
      },
      legend: {
        show: true,
        position: 'bottom',
        horizontalAlign: 'center',
        floating: false,
        fontSize: '13px',
        fontWeight: 600,
        fontFamily: 'Inter, system-ui, sans-serif',
        offsetY: 10,
        markers: {
          width: 14,
          height: 14,
          strokeWidth: 0,
          radius: 3,
          offsetX: -5,
          offsetY: 0
        },
        itemMargin: {
          horizontal: 16,
          vertical: 8
        },
        onItemClick: {
          toggleDataSeries: true
        },
        onItemHover: {
          highlightDataSeries: true
        },
        formatter: (seriesName: string, opts: any) => {
          const seriesIndex = opts.seriesIndex;
          const avgScore = series[seriesIndex].data.reduce((a: number, b: number) => a + b, 0) / series[seriesIndex].data.length;
          return `${seriesName} <span style="color: #9C9484; font-weight: 400; margin-left: 4px;">(Avg: ${avgScore.toFixed(1)})</span>`;
        }
      },
      plotOptions: {
        radar: {
          size: 220,
          offsetX: 0,
          offsetY: 0,
          polygons: {
            strokeColors: '#332C1D',
            strokeWidth: 1.5,
            connectorColors: '#332C1D',
            fill: {
              colors: ['#141209', '#1B1810']
            }
          }
        }
      },
      tooltip: {
        enabled: true,
        style: {
          fontSize: '12px',
          fontFamily: 'Inter, system-ui, sans-serif'
        },
        onDatasetHover: {
          highlightDataSeries: true
        },
        custom: ({ series, seriesIndex, dataPointIndex, w }) => {
          const categoryCode = this.compareCountryResponseDto?.categories?.[dataPointIndex] ?? "";

          // Find the full category name from tableData
          const categoryData = this.chartTableData.find(x => x.countryName === categoryCode);
          const categoryName = categoryData?.countryName ?? categoryCode;

          let tooltipHtml = `
          <div style="
            padding: 16px; 
            background: linear-gradient(135deg, #1B1810 0%, #141209 100%); 
            border-radius: 12px; 
            box-shadow: 0 12px 32px rgba(0,0,0,0.45);
            min-width: 280px;
            border: 1px solid #332C1D;
          ">
            <div style="
              font-weight: 700; 
              margin-bottom: 12px; 
              color: #EFE7D6; 
              font-size: 14px; 
              border-bottom: 2px solid #332C1D; 
              padding-bottom: 8px;
              display: flex;
              align-items: center;
              gap: 8px;
            ">
              <span style="
                width: 8px; 
                height: 8px; 
                background: linear-gradient(135deg, #E7C878, #C9A24A); 
                border-radius: 50%;
                display: inline-block;
              "></span>
              ${categoryName}
            </div>
            `;

          // Get all countries' scores for this category
          const countryScores: Array<{ name: string, score: number, color: string, index: number }> = [];

          (this.compareCountryResponseDto?.series ?? []).forEach((countryData, idx) => {
            const score = countryData.data[dataPointIndex];
            const colors = colorPalette[idx % colorPalette.length];
            countryScores.push({
              name: countryData.name,
              score: score,
              color: colors.primary,
              index: idx
            });
          });

          // Sort by score (highest first)
          countryScores.sort((a, b) => b.score - a.score);

          // Display each country's score
          countryScores.forEach((country, rank) => {
            const rankEmoji = rank === 0 ? '🥇' : rank === 1 ? '🥈' : rank === 2 ? '🥉' : `${rank + 1}.`;
            const scoreColor = country.score >= 80 ? '#059669' : country.score >= 60 ? '#d97706' : '#dc2626';

            tooltipHtml += `
            <div style="
              margin: 8px 0; 
              padding: 10px 12px; 
              background: ${country.color}08; 
              border-radius: 8px; 
              border-left: 3px solid ${country.color};
              transition: all 0.2s ease;
            ">
              <div style="
                display: flex; 
                justify-content: space-between; 
                align-items: center;
                gap: 12px;
              ">
                <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
                  <span style="font-size: 16px;">${rankEmoji}</span>
                  <span style="
                    font-weight: 600; 
                    color: ${country.color}; 
                    font-size: 13px;
                  ">${country.name}</span>
                </div>
                <div style="
                  font-weight: 700; 
                  font-size: 18px; 
                  color: ${scoreColor};
                  min-width: 60px;
                  text-align: right;
                ">${country.score.toFixed(1)}</div>
              </div>
              
              <!-- Score bar -->
              <div style="
                margin-top: 8px; 
                height: 6px; 
                background: #332C1D; 
                border-radius: 3px; 
                overflow: hidden;
              ">
                <div style="
                  height: 100%; 
                  width: ${country.score}%; 
                  background: linear-gradient(90deg, ${country.color}, ${colorPalette[country.index].light});
                  border-radius: 3px;
                  transition: width 0.3s ease;
                "></div>
              </div>
            </div>
          `;
          });

          // Add statistics footer
          const avgScore = countryScores.reduce((sum, country) => sum + country.score, 0) / countryScores.length;
          const maxScore = countryScores[0].score;
          const minScore = countryScores[countryScores.length - 1].score;
          const spread = maxScore - minScore;

          tooltipHtml += `
          <div style="
            margin-top: 12px; 
            padding-top: 12px; 
            border-top: 1px solid #332C1D;
            display: flex;
            justify-content: space-around;
            font-size: 11px;
            color: #9C9484;
          ">
            <div style="text-align: center;">
              <div style="font-weight: 600; color: #9C9484;">Avg</div>
              <div style="font-weight: 700; color: #EFE7D6; margin-top: 2px;">${avgScore.toFixed(1)}</div>
            </div>
            <div style="width: 1px; background: #332C1D;"></div>
            <div style="text-align: center;">
              <div style="font-weight: 600; color: #9C9484;">Range</div>
              <div style="font-weight: 700; color: #EFE7D6; margin-top: 2px;">${spread.toFixed(1)}</div>
            </div>
            <div style="width: 1px; background: #332C1D;"></div>
            <div style="text-align: center;">
              <div style="font-weight: 600; color: #9C9484;">Best</div>
              <div style="font-weight: 700; color: #059669; margin-top: 2px;">${maxScore.toFixed(1)}</div>
            </div>
          </div>
        `;

          tooltipHtml += '</div>';
          return tooltipHtml;
        }
      },
      responsive: [
        {
          breakpoint: 1024,
          options: {
            chart: {
              height: 500
            },
            plotOptions: {
              radar: {
                size: 180
              }
            }
          }
        },
        {
          breakpoint: 768,
          options: {
            chart: {
              height: 450
            },
            plotOptions: {
              radar: {
                size: 150
              }
            },
            xaxis: {
              labels: {
                style: {
                  fontSize: '10px'
                }
              }
            }
          }
        }
      ]
    };

    this.radarChartOptions = radarOptions;
  }

  getCountryScore(countryID: number, isAi: boolean = false): string {
    const country = this.countries?.find(c => c.countryID === countryID);
    if (isAi) {
      return country?.aiScore?.toFixed(2) || '0';
    }
    return country?.score?.toFixed(2) || '0';
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
    this.maxCountry = [...this.chartTableData]
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
    viewPEMAveumCrossComparision(){
    this.chatService.crossComparisionCountryIDs.next(this.selectedCountries);
    this.router.navigate(['/countryuser/aevum'], { state: { role: UserRole.CountryUser } });
  }
}
