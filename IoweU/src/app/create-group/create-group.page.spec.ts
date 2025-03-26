import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CreateGroupPage } from './create-group.page';

describe('CreateGroupPage', () => {
  let component: CreateGroupPage;
  let fixture: ComponentFixture<CreateGroupPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CreateGroupPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
