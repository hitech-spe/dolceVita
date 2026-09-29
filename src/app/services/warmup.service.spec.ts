import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { WarmupService } from './warmup.service';
import { API_CONFIG } from '../config/api.config';

describe('WarmupService', () => {
  let service: WarmupService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        WarmupService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(WarmupService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    service.stopKeepAlive();
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
    expect(service.isWarmedUp()).toBeFalse();
    expect(service.isWarmingUp()).toBeFalse();
  });

  it('should ping the backend and set isWarmedUp to true upon successful response', fakeAsync(() => {
    service.pingBackend();
    expect(service.isWarmingUp()).toBeTrue();

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/`);
    expect(req.request.method).toBe('GET');
    req.flush('OK');

    expect(service.isWarmingUp()).toBeFalse();
    expect(service.isWarmedUp()).toBeTrue();
    expect(service.lastPingTimestamp()).toBeTruthy();
  }));

  it('should tolerate 401 unauthorized error and still mark backend as awake', fakeAsync(() => {
    service.pingBackend();

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/`);
    req.flush('Unauthorized', { status: 401, statusText: 'Unauthorized' });

    expect(service.isWarmingUp()).toBeFalse();
    expect(service.isWarmedUp()).toBeTrue();
    expect(service.lastPingTimestamp()).toBeTruthy();
  }));

  it('should start keep alive and ping periodically', fakeAsync(() => {
    service.startKeepAlive(1); // 1 minute interval for testing

    // First immediate ping
    const req1 = httpMock.expectOne(`${API_CONFIG.baseUrl}/`);
    req1.flush('OK');

    // Fast-forward 1 minute
    tick(60000);

    const req2 = httpMock.expectOne(`${API_CONFIG.baseUrl}/`);
    req2.flush('OK');

    expect(service.isWarmedUp()).toBeTrue();
    service.stopKeepAlive();
  }));
});
