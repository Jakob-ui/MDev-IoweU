import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpenseDetailsPage } from './expense-details.page';

describe('ExpenseDetailsPage', () => {
  let component: ExpenseDetailsPage;
  let fixture: ComponentFixture<ExpenseDetailsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpenseDetailsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
