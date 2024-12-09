import { TestBed } from '@angular/core/testing';

import { ApiAuthInterceptorService } from './api-auth-interceptor.service';

describe('ApiAuthInterceptorService', () => {
  let service: ApiAuthInterceptorService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ApiAuthInterceptorService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
