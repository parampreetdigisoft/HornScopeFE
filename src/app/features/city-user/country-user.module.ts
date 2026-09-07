import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Routes } from '@angular/router';
import { CountryUserComponent } from './country-user.component';
import { tierAccessGuard } from 'src/app/core/services/tier-access.guard';
import { SharedModule } from 'src/app/shared/share.module';
import { CountryViewComponent } from './container/country-view/country-view.component';
import { CountryDetailsComponent } from './features/country-details/country-details.component';
import { ChooseKpisComponent } from './container/choose-kpis/choose-kpis.component';
import { CountryUserDashboardComponent } from './container/country-signal-dashboard/country-signal-dashboard.component';
const routes: Routes = [
  {
    path: '',
    component: CountryUserComponent,
    canActivate: [tierAccessGuard],
    children: [
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
      { path: 'dashboard', component: CountryUserDashboardComponent },
      { path: 'country-view', component: CountryViewComponent },
      { path: 'country-details', component: CountryDetailsComponent },
      {
        path: 'kpi-layer', 
        loadComponent: () => import('./container/kpi-layers/kpi-layers.component').then(m => m.KpiLayersComponent)
      },
      {
        path: 'comparision', 
        loadComponent: () => import('./container/comparison/comparison.component').then(m => m.ComparisonComponent)
      },
      {
        path: 'ai/country-analysis',
        loadComponent: () => import('./container/ai-country-analysis/aicountry-analysis.component').then(m => m.AICountryAnalaysisComponent)
      },
      {
        path: 'ai/country-comparison',
        loadComponent: () => import('./container/ai-country-comparison/ai-country-comparison.component').then(m => m.AiCountryComparisonComponent)
      },
      // {
      //   path: 'ai/questions-analysis',
      //   loadComponent: () => import('./container/ai-question-analysis/ai-question-analysis.component').then(m => m.AiQuestionAnalysisComponent)
      // },
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
    CountryUserComponent,
    CountryUserDashboardComponent,
    CountryViewComponent,
    CountryDetailsComponent,
    ChooseKpisComponent
  ],
  imports: [
    CommonModule,
    SharedModule,
    RouterModule.forChild(routes)
  ]
})
export class CountryUserModule { } 