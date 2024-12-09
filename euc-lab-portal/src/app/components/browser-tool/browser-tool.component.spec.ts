import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BrowserToolComponent } from './browser-tool.component';

describe('BrowserToolComponent', () => {
  let component: BrowserToolComponent;
  let fixture: ComponentFixture<BrowserToolComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ BrowserToolComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(BrowserToolComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
