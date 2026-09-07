import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { EvaluatorComponent } from './evaluator/evaluator.component';
import { AssessmentResultComponent } from './container/assessment-result/assessment-result.component';
import { MakeAssessmentComponent } from './container/make-assessment/make-assessment.component';
import { SharedModule } from 'src/app/shared/share.module';
import { AssignedCountryComponent } from './container/assigned-country/assigned-country.component';
import { AssessmentViewResultComponent } from './container/assessment-view-result/assessment-view-result.component';
import { EvaluatorDashboardComponent } from './container/evaluator-dashboard/evaluator-dashboard.component';
import { CircularScoreComponent } from 'src/app/shared/standAlone/circular-score/circular-score.component';

const routes: Routes = [
  {
    path: '',
    component: EvaluatorComponent,
    data: { roles: [] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'rosew-dashboard', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: EvaluatorDashboardComponent },
      { path: 'assigned-country', component: AssignedCountryComponent },
      { path: 'make-assessment', component: MakeAssessmentComponent },
      { path: 'assessment-result', component: AssessmentResultComponent },
      { path: 'assessment-result/:assessmentID/:userName', component: AssessmentViewResultComponent },
      {
        path: 'ai/country-analysis',
        loadComponent: () => import('./container/ai-country-analysis/aicountry-analysis.component').then(m => m.AICountryAnalaysisComponent)
      },
      {
        path: 'ai/country-comparison',
        loadComponent: () => import('./container/ai-country-comparison/ai-country-comparison.component').then(m => m.AiCountryComparisonComponent)
      },
      {
        path: 'ai/kpi-analysis',
        loadComponent: () => import('./container/ai-kpi-analysis/kpianalysis.component').then(m => m.KPIAnalysisComponent)
      }
    ]
  }
];

@NgModule({
  declarations: [
    EvaluatorComponent,
    AssessmentResultComponent,
    MakeAssessmentComponent,
    AssignedCountryComponent,
    EvaluatorDashboardComponent,
    AssessmentViewResultComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    CircularScoreComponent,
    RouterModule.forChild(routes)
  ]
})
export class EvaluatorModule { }
