import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateExpancePage } from './create-expance.page';

describe('CreateExpancePage', () => {
  let component: CreateExpancePage;
  let fixture: ComponentFixture<CreateExpancePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateExpancePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
