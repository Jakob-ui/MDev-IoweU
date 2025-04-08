import { ComponentFixture, TestBed } from '@angular/core/testing';
import { EditExpensePage } from './edit-expense.page';

describe('EditExpensePage', () => {
  let component: EditExpensePage;
  let fixture: ComponentFixture<EditExpensePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(EditExpensePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
