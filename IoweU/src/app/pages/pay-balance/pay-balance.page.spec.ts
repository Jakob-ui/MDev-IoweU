import { ComponentFixture, TestBed } from '@angular/core/testing';
import { PayBalancePage } from './pay-balance.page';

describe('PayBalancePage', () => {
  let component: PayBalancePage;
  let fixture: ComponentFixture<PayBalancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(PayBalancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
