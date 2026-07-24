import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GymDetailPage } from './gym-detail.page';

describe('GymDetailPage', () => {
  let component: GymDetailPage;
  let fixture: ComponentFixture<GymDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GymDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
