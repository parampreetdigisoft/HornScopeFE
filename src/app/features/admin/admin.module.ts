import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './component/admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from 'src/app/shared/share.module';
import { CountryComponent } from './container/country/country.component';
import { PillarComponent } from './container/pillar/pillar.component';
import { QuestionComponent } from './container/question/question.component';
import { AssesmentComponent } from './container/assesment/assesment.component';
import { AddUpdateAnalystComponent } from './features/add-update-analyst/add-update-analyst.component';

import { AnalystViewComponent } from './container/analyst-view/analyst-view.component';
import { AddUpdateQuestionComponent } from './features/add-update-question/add-update-question.component';
import { EvaluatoinResponseViewComponent } from './container/evaluatoin-response-view/evaluatoin-response-view.component';
import { UpdatePillarComponent } from './features/update-pillar/update-pillar.component';
import { QuillModule } from 'ngx-quill';
import { AdminDashboardComponent } from './container/admin-dashboard/admin-dashboard.component';
import { ComparisionComponent } from './container/comparision/comparision.component';
import { TransterAssessmentComponent } from './features/transter-assessment/transter-assessment.component';
import { KpiComparisionComponent } from './container/kpi-comparision/kpi-comparision.component';
import { KpiLayersComponent } from './container/kpi-layers/kpi-layers.component';
import { AddUpdateCountryComponent } from './features/add-update-country/add-update-country.component';
import { CountryUserViewComponent } from './container/country-user-view/country-user-view.component';
import { AddUpdateCountryUserComponent } from './features/add-update-country-user/add-update-country-user.component';

@NgModule({
  declarations: [
    AdminComponent,
    CountryComponent,
    PillarComponent,
    QuestionComponent,
    AssesmentComponent,
    AddUpdateAnalystComponent,
    AddUpdateCountryComponent,
    AnalystViewComponent,
    AddUpdateQuestionComponent,
    EvaluatoinResponseViewComponent,
    UpdatePillarComponent,
    AdminDashboardComponent,
    ComparisionComponent,
    TransterAssessmentComponent,
    CountryUserViewComponent,
    AddUpdateCountryUserComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    AdminRoutingModule,
    QuillModule.forRoot({
      theme: 'snow',
      format: 'html' ,
      modules: {
        toolbar: [
          ['bold', 'italic', 'underline'],
          [{ 'list': 'ordered' }, { 'list': 'bullet' }],
          [{ 'header': [1, 2, 3, false] }],
          ['link', 'image']
        ]
      }
    }) 
  ],
  //bootstrap: [AdminComponent]
})
export class AdminModule { } 