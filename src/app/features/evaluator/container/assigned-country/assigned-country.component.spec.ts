import { ComponentFixture, TestBed } from '@angular/core/testing';

import { AssignedCountryComponent } from './assigned-country.component';

describe('AssignedCityComponent', () => {
  let component: AssignedCountryComponent;
  let fixture: ComponentFixture<AssignedCountryComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AssignedCityComponent]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(AssignedCountryComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
