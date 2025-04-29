import { ComponentFixture, TestBed } from '@angular/core/testing';
import { OverallBalancePage } from './overall-balance.page';

describe('OverallBalancePage', () => {
  let component: OverallBalancePage;
  let fixture: ComponentFixture<OverallBalancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(OverallBalancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
