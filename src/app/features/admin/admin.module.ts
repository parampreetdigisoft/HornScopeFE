import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AdminComponent } from './component/admin.component';
import { AdminRoutingModule } from './admin-routing.module';
import { SharedModule } from 'src/app/shared/share.module';
import { PillarComponent } from './container/pillar/pillar.component';
import { QuestionComponent } from './container/question/question.component';
import { AssesmentComponent } from './container/assesment/assesment.component';
import { AddUpdateAnalystComponent } from './features/add-update-analyst/add-update-analyst.component';
import { AnalystViewComponent } from './container/analyst-view/analyst-view.component';
import { AddUpdateQuestionComponent } from './features/add-update-question/add-update-question.component';
import { EvaluatoinResponseViewComponent } from './container/evaluatoin-response-view/evaluatoin-response-view.component';
import { UpdatePillarComponent } from './features/update-pillar/update-pillar.component';
import { QuillModule } from 'ngx-quill';
import { AdminPulseDashboardComponent } from './container/admin-pulse-dashboard/admin-pulse-dashboard.component';
import { ComparisionComponent } from './container/comparision/comparision.component';
import { TransterAssessmentComponent } from './features/transter-assessment/transter-assessment.component';
import { AddUpdateProgramComponent } from './features/add-update-program/add-update-program.component';
import { ClientViewComponent } from './container/client-view/client-view.component';
import { AddUpdateClientComponent } from './features/add-update-client/add-update-client.component';
import { ProgramsComponent } from './container/programs/programs.component';

@NgModule({
  declarations: [
    AdminComponent,
    ProgramsComponent,
    PillarComponent,
    QuestionComponent,
    AssesmentComponent,
    AddUpdateAnalystComponent,
    AddUpdateProgramComponent,
    AnalystViewComponent,
    AddUpdateQuestionComponent,
    EvaluatoinResponseViewComponent,
    UpdatePillarComponent,
    ComparisionComponent,
    TransterAssessmentComponent,
    ClientViewComponent,
    AddUpdateClientComponent,
  ],
  imports: [
    CommonModule,
    SharedModule,
    AdminRoutingModule,
    AdminPulseDashboardComponent,
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