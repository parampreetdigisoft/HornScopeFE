import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignedProgramComponent } from './assigned-program.component';

describe('AssignedProgramComponent', () => {
  let component: AssignedProgramComponent;
  let fixture: ComponentFixture<AssignedProgramComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedProgramComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssignedProgramComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
