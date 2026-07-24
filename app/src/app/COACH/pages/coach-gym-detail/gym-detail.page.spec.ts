import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CoachGymDetailPage } from './coach-gym-detail.page';

describe('CoachGymDetailPage', () => {
  let component: CoachGymDetailPage;
  let fixture: ComponentFixture<CoachGymDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CoachGymDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
