import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ExpancePage } from './expance.page';

describe('ExpancePage', () => {
  let component: ExpancePage;
  let fixture: ComponentFixture<ExpancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ExpancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
