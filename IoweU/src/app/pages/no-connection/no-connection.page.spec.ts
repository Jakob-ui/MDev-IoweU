import { ComponentFixture, TestBed } from '@angular/core/testing';
import { NoConnectionPage } from './no-connection.page';

describe('NoConnectionPage', () => {
  let component: NoConnectionPage;
  let fixture: ComponentFixture<NoConnectionPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(NoConnectionPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
