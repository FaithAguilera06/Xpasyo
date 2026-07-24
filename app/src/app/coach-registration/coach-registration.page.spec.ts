import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { CoachRegistrationPage } from './coach-registration.page';

describe('CoachRegistrationPage', () => {
  let component: CoachRegistrationPage;
  let fixture: ComponentFixture<CoachRegistrationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, CoachRegistrationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(CoachRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
