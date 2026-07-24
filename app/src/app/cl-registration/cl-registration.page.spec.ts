import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RouterTestingModule } from '@angular/router/testing';
import { ClRegistrationPage } from './cl-registration.page';

describe('ClRegistrationPage', () => {
  let component: ClRegistrationPage;
  let fixture: ComponentFixture<ClRegistrationPage>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RouterTestingModule, ClRegistrationPage],
    }).compileComponents();

    fixture = TestBed.createComponent(ClRegistrationPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
