import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayExpensesPage } from './pay-expenses.page';

describe('PayExpensesPage', () => {
  let component: PayExpensesPage;
  let fixture: ComponentFixture<PayExpensesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PayExpensesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
