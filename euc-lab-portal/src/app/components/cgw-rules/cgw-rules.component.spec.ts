import { ComponentFixture, TestBed } from '@angular/core/testing';

import { CgwRulesComponent } from './cgw-rules.component';

describe('CgwRulesComponent', () => {
  let component: CgwRulesComponent;
  let fixture: ComponentFixture<CgwRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ CgwRulesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(CgwRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
