import { ComponentFixture, TestBed } from '@angular/core/testing';

import { WebCertificatesComponent } from './web-certificates.component';

describe('WebCertificatesComponent', () => {
  let component: WebCertificatesComponent;
  let fixture: ComponentFixture<WebCertificatesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ WebCertificatesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WebCertificatesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
