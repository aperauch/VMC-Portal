import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NatRulesComponent } from './nat-rules.component';

describe('NatRulesComponent', () => {
  let component: NatRulesComponent;
  let fixture: ComponentFixture<NatRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ NatRulesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(NatRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
