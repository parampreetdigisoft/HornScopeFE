import {
  Component,
  Input,
  OnChanges,
  OnDestroy,
  OnInit,
  SimpleChanges,
  ViewChild,
} from "@angular/core";
import { AgChartOptions } from "ag-charts-community";
import { AssessmentWithProgressVM } from "src/app/core/models/AssessmentResponse";
import {
  ApexNonAxisChartSeries,
  ApexPlotOptions,
  ApexChart,
  ApexFill,
  ChartComponent,
  ApexStroke
} from "ng-apexcharts";
import { Router } from "@angular/router";

export type ChartOptions = {
  series: ApexNonAxisChartSeries;
  chart: ApexChart;
  labels: string[];
  plotOptions: ApexPlotOptions;
  fill: ApexFill;
  stroke: ApexStroke;
};

@Component({
  selector: "app-show-assessment-progress",
  templateUrl: "./show-assessment-progress.component.html",
  styleUrl: "./show-assessment-progress.component.css",
})
export class ShowAssessmentProgressComponent implements OnInit, OnChanges, OnDestroy {

  @Input() assessmentProgress: AssessmentWithProgressVM | null = null;
  options: AgChartOptions = {};
  @ViewChild("chart") chart!: ChartComponent;
  public chartOptions!: Partial<ChartOptions>;
  isShow: boolean = true;

  constructor(private router: Router) { }

  ngOnChanges(changes: SimpleChanges): void {
    this.isShow = true;
    if (this.router.url.includes('assessment')) {
      this.getoptions();
    } else {
      this.isShow = false;
    }
  }
  ngOnDestroy(): void {
    this.chartOptions = {};
  }

  ngOnInit(): void { }

  getoptions() {
    this.chartOptions = {
      series: [this.assessmentProgress?.currentProgress ?? 0],
      chart: {
        height: 130,
        type: "radialBar",
        toolbar: {
          show: false
        },
        background: "transparent",
        foreColor: "#EFE7D6",
      },
      plotOptions: {
        radialBar: {
          offsetX: 0,
          offsetY: 0,
          startAngle: -135,
          endAngle: 225,
          hollow: {
            margin: 0,
            size: "72%",
            background: "#141209",
            image: undefined,
            position: "front",
            dropShadow: {
              enabled: true,
              top: 2,
              left: 0,
              blur: 4,
              opacity: 0.3
            }
          },
          track: {
            background: "#332C1D",
            strokeWidth: "55%",
            margin: 2,
            dropShadow: {
              enabled: false,
              top: 0,
              left: 0,
              blur: 0,
              opacity: 0
            }
          },
          dataLabels: {
            show: true,
            name: {
              offsetY: -8,
              show: true,
              color: "#9C9484",
              fontSize: "11px",
              fontWeight: 500,
              fontFamily: "Inter, Poppins, sans-serif",
            },
            value: {
              formatter: function (val) {
                return val.toString() + "%";
              },
              offsetY: 2,
              color: "#E7C878",
              fontSize: "20px",
              fontWeight: 700,
              fontFamily: "Inter, Poppins, sans-serif",
              show: true
            }
          }
        }
      },
      fill: {
        type: "solid",
        colors: ["#C9A24A"]
      },
      stroke: {
        lineCap: "round"
      },
      labels: ["Completed"]
    };
  }
}
