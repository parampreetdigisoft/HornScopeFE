import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { ClientComponent } from './client.component';
import { tierAccessGuard } from 'src/app/core/services/tier-access.guard';
import { SharedModule } from 'src/app/shared/share.module';
import { ChooseKpisComponent } from './container/choose-kpis/choose-kpis.component';
import { ClientPulseDashboardComponent } from './container/client-pulse-dashboard/client-pulse-dashboard.component';
import { ClientProgramViewComponent } from './container/client-program-view/client-program-view.component';
import { ProgramDetailsComponent } from './features/program-details/program-details.component';
const routes: Routes = [
  {
    path: '',
    component: ClientComponent,
    canActivate: [tierAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: ClientPulseDashboardComponent },
      { path: 'program-view', component: ClientProgramViewComponent },
      { path: 'program-details', component: ProgramDetailsComponent },
      {
        path: 'kpi-layer', 
        loadComponent: () => import('./container/kpi-layers/kpi-layers.component').then(m => m.KpiLayersComponent)
      },
      {
        path: 'comparison', 
        loadComponent: () => import('./container/comparison/comparison.component').then(m => m.ComparisonComponent)
      },
      {
        path: 'ai/program-analysis',
        loadComponent: () => import('./container/ai-program-analysis/aiprogram-analysis.component').then(m => m.AIProgramAnalysisComponent)
      },
      {
        path: 'ai/program-comparison',
        loadComponent: () => import('./container/ai-program-comparison/ai-program-comparison.component').then(m => m.AiProgramComparisonComponent)
      },
      {
        path: 'ai/kpi-analysis',
        loadComponent: () => import('./container/ai-kpi-analysis/kpianalysis.component').then(m => m.KPIAnalysisComponent)
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
  {
    path: 'payment',
    loadChildren: () => import("../payment-getway/payment-getway.module").then((m) => m.PaymentGetwayModule)
  }
];

@NgModule({
  declarations: [
    ClientComponent,
    ClientProgramViewComponent,
    ProgramDetailsComponent,
    ChooseKpisComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes),
    ClientPulseDashboardComponent
  ]
})
export class ClientModule { } 