import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PlanEntry } from './plan-entry';

describe('PlanEntry', () => {
  let component: PlanEntry;
  let fixture: ComponentFixture<PlanEntry>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PlanEntry]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PlanEntry);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
