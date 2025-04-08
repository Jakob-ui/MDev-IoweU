import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RepeatingExpensesPage } from './repeating-expenses.page';

describe('EditRepeatingExpensesPage', () => {
  let component: RepeatingExpensesPage;
  let fixture: ComponentFixture<RepeatingExpensesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RepeatingExpensesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
