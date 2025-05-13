import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ShoppingcartPage } from './shoppingcart.page';

describe('ShoppingcartPage', () => {
  let component: ShoppingcartPage;
  let fixture: ComponentFixture<ShoppingcartPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ShoppingcartPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
