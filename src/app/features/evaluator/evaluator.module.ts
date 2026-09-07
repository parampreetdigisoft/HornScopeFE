import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { EvaluatorComponent } from './evaluator/evaluator.component';
import { AssessmentResultComponent } from './container/assessment-result/assessment-result.component';
import { MakeAssessmentComponent } from './container/make-assessment/make-assessment.component';
import { SharedModule } from 'src/app/shared/share.module';
import { AssessmentViewResultComponent } from './container/assessment-view-result/assessment-view-result.component';
import { AssignedProgramComponent } from './container/assigned-program/assigned-program.component';
import { EvaluatorPulseDashboardComponent } from './container/evaluator-pulse-dashboard/evaluator-pulse-dashboard.component';

const routes: Routes = [
  {
    path: '',
    component: EvaluatorComponent,
    data: { roles: [] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },       
      { path: 'dashboard', component: EvaluatorPulseDashboardComponent },
      { path: 'assigned-program', component: AssignedProgramComponent },
      { path: 'make-assessment', component: MakeAssessmentComponent },
      { path: 'assessment-result', component: AssessmentResultComponent },
      { path: 'assessment-result/:assessmentID/:userName', component: AssessmentViewResultComponent },
      {
        path: 'ai/program-analysis',
        loadComponent: () => import('./container/ai-program-analysis/aiprogram-analysis.component').then(m => m.AIProgramAnalaysisComponent)
      },
      {
        path: 'ai/program-comparison',
        loadComponent: () => import('./container/ai-program-comparison/ai-program-comparison.component').then(m => m.AiProgramComparisonComponent)
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
    AssignedProgramComponent,
    AssessmentViewResultComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes),
    EvaluatorPulseDashboardComponent
  ]
})
export class EvaluatorModule { } 