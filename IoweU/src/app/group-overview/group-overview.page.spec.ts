import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GroupOverviewPage } from './group-overview.page';

describe('GroupOverviewPage', () => {
  let component: GroupOverviewPage;
  let fixture: ComponentFixture<GroupOverviewPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GroupOverviewPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
