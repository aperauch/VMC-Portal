import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PublicIpsComponent } from './public-ips.component';

describe('PublicIpsComponent', () => {
  let component: PublicIpsComponent;
  let fixture: ComponentFixture<PublicIpsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ PublicIpsComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(PublicIpsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
