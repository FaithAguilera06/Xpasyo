import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ClassDetailPage } from './class-detail.page';

describe('ClassDetailPage', () => {
  let component: ClassDetailPage;
  let fixture: ComponentFixture<ClassDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ClassDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
