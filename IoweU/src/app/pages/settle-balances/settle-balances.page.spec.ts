import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SettleBalancesPage } from './settle-balances.page';

describe('SettleBalancesPage', () => {
  let component: SettleBalancesPage;
  let fixture: ComponentFixture<SettleBalancesPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SettleBalancesPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
