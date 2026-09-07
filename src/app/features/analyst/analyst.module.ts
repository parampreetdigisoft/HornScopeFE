import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { AnalystComponent } from './analyst.component';
import { AssignedProgramComponent } from './container/assigned-program/assigned-program.component';
import { EvaluatorViewComponent } from './container/evaluator-view/evaluator-view.component';
import { AnalystAssessmentComponent } from './container/analyst-assessment/analyst-assessment.component';
import { SharedModule } from 'src/app/shared/share.module';
import { AddUpdateEvaluatorComponent } from './features/add-update-evaluator/add-update-evaluator.component';
import { EvaluatorResponsesComponent } from './container/evaluator-responses/evaluator-responses.component';
import { EvaluatorResponseViewComponent } from './container/evaluator-response-view/evaluator-response-view.component';
import { AnalystPulseDashboardComponent } from './container/analyst-pulse-dashboard/analyst-pulse-dashboard.component';
import { ComparisionComponent } from './container/comparision/comparision.component';
const routes: Routes = [
  {
    path: '',
    component: AnalystComponent,
    data: { roles: [] },
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: AnalystPulseDashboardComponent },
      { path: 'assigned-program', component: AssignedProgramComponent },
      { path: 'evaluator-view', component: EvaluatorViewComponent },
      { path: 'evaluator-response/:assessmentUserID', component: EvaluatorResponsesComponent },
      { path: 'evaluator-response', component: EvaluatorResponsesComponent },
      { path: 'evaluator-response/:userID/:climateProgramID', component: EvaluatorResponsesComponent },
      { path: 'analyst-assessment', component: AnalystAssessmentComponent },
      { path: 'assessment-result/:assessmentID/:userName', component: EvaluatorResponseViewComponent },
      { path: 'evaluator-comparison', component: ComparisionComponent },
      {
        path: 'kpi-layers',
        loadComponent: () => import('./container/kpi-layers/kpi-layers.component').then(m => m.KpiLayersComponent)
      },
      {
        path: 'kpi-comparison',
        loadComponent: () => import('./container/kpi-comparision/kpi-comparision.component').then(m => m.KpiComparisionComponent)
      },
      {
        path: 'ai/program-analysis',
        loadComponent: () => import('./container/ai-program-analysis/aiprogram-analysis.component').then(m => m.AIProgramAnalaysisComponent)
      },
      {
        path: 'ai/program-comparison',
        loadComponent: () => import('./container/ai-program-comparison/ai-program-comparison.component').then(m => m.AiProgramComparisonComponent)
      },
      {
        path: 'ai/questions-analysis',
        loadComponent: () => import('./container/ai-question-analysis/ai-question-analysis.component').then(m => m.AiQuestionAnalysisComponent)
      },
      {
        path: 'ai/kpi-analysis',
        loadComponent: () => import('./container/ai-kpi-analysis/kpianalysis.component').then(m => m.KPIAnalysisComponent)
      }
    ],
  },

];

@NgModule({
  declarations: [
    AnalystComponent,
    AssignedProgramComponent,
    EvaluatorViewComponent,
    AnalystAssessmentComponent,
    AddUpdateEvaluatorComponent,
    EvaluatorResponsesComponent,
    EvaluatorResponseViewComponent,
    ComparisionComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes),
    AnalystPulseDashboardComponent
  ]
})
export class AnalystModule { } 