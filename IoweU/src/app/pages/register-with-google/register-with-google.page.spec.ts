import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RegisterWithGooglePage } from './register-with-google.page';

describe('RegisterWithGooglePage', () => {
  let component: RegisterWithGooglePage;
  let fixture: ComponentFixture<RegisterWithGooglePage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(RegisterWithGooglePage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
