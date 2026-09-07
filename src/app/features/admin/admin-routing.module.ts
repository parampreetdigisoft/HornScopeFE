import { NgModule } from "@angular/core";
import { CommonModule } from "@angular/common";
import { RouterModule, Routes } from "@angular/router";
import { AdminComponent } from "./component/admin.component";
import { PillarComponent } from "./container/pillar/pillar.component";
import { QuestionComponent } from "./container/question/question.component";
import { AssesmentComponent } from "./container/assesment/assesment.component";
import { AnalystViewComponent } from "./container/analyst-view/analyst-view.component";
import { AdminPulseDashboardComponent } from "./container/admin-pulse-dashboard/admin-pulse-dashboard.component";
import { ComparisionComponent } from "./container/comparision/comparision.component";
import { EvaluatoinResponseViewComponent } from "./container/evaluatoin-response-view/evaluatoin-response-view.component";
import { ProgramsComponent } from "./container/programs/programs.component";
import { ClientViewComponent } from "./container/client-view/client-view.component";

const routes: Routes = [
  {
    path: "",
    component: AdminComponent,
    children: [
      { path: "", redirectTo: "dashboard", pathMatch: "full" },
      { path: "dashboard", component: AdminPulseDashboardComponent },
      { path: "programs", component: ProgramsComponent },
      { path: "analyst", component: AnalystViewComponent },
      { path: "client", component: ClientViewComponent },
      { path: "pillar", component: PillarComponent },
      { path: "question", component: QuestionComponent },
      { path: "assessment", component: AssesmentComponent },
      { path: "assessment/:roleID/:climateProgramID", component: AssesmentComponent },
      {
        path: "assessment-result/:assessmentID/:userName",
        component: EvaluatoinResponseViewComponent,
      },
      { path: "viewUser/:roleID", component: AnalystViewComponent },
      { path: "evaluator-comparison", component: ComparisionComponent },
      {
        path: "kpi-layers",
        loadComponent: () =>
          import("./container/kpi-layers/kpi-layers.component").then(
            (m) => m.KpiLayersComponent
          ),
      },
      {
        path: "kpi-comparison",
        loadComponent: () =>
          import("./container/kpi-comparision/kpi-comparision.component").then(
            (m) => m.KpiComparisionComponent
          ),
      },
      {
        path: "ai/program-analysis",
        loadComponent: () =>
          import("./container/ai-program-analysis/ai-program-analysis.component").then(
            (m) => m.AIProgramAnalaysisComponent
          ),
      },

      {
        path: "ai/program-comparison",
        loadComponent: () =>
          import(
            "./container/ai-program-comparison/ai-program-comparison.component"
          ).then((m) => m.AiProgramComparisonComponent),
      },
      {
        path: "ai/questions-analysis",
        loadComponent: () =>
          import(
            "./container/ai-question-analysis/ai-question-analysis.component"
          ).then((m) => m.AiQuestionAnalysisComponent),
      },
      {
        path: "ai/kpi-analysis",
        loadComponent: () =>
          import("./container/ai-kpi-analysis/kpianalysis.component").then(
            (m) => m.KPIAnalysisComponent
          ),
      },
      {
        path: "ai-documents",
        loadComponent: () =>
          import("./container/ai-documents/ai-documents.component").then(
            (m) => m.AiDocumentsComponent
          ),
      },
      {
        path: "aevum",
        loadComponent: () =>
          import("../../shared/chatbox/chat-container/chat-container.component").then(
            (m) => m.ChatContainerComponent
          ),
      }
    ],
  },
];

@NgModule({
  declarations: [],
  imports: [CommonModule, RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class AdminRoutingModule {}
