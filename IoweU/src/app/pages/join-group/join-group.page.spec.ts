import { ComponentFixture, TestBed } from '@angular/core/testing';
import { JoinGroupPage } from './join-group.page';

describe('JoinGroupPage', () => {
  let component: JoinGroupPage;
  let fixture: ComponentFixture<JoinGroupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(JoinGroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
