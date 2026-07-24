import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CustomSplashComponent } from './custom-splash.component';

describe('CustomSplashComponent', () => {
  let component: CustomSplashComponent;
  let fixture: ComponentFixture<CustomSplashComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [CustomSplashComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(CustomSplashComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
