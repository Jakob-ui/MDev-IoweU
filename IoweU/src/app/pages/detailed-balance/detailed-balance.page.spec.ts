import { ComponentFixture, TestBed } from '@angular/core/testing';
import { DetailedBalancePage } from './detailed-balance.page';

describe('DetailedBalancePage', () => {
  let component: DetailedBalancePage;
  let fixture: ComponentFixture<DetailedBalancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailedBalancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
