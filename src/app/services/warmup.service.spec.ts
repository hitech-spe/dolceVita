import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { WarmupService } from './warmup.service';
import { API_CONFIG } from '../config/api.config';

describe('WarmupService', () => {
  let service: WarmupService;
  let httpMock: HttpTestingController;
  let mockAuth: any;
  const warmupUrl = `${API_CONFIG.baseUrl}/api/v1/system/warmup`;

  beforeEach(() => {
    mockAuth = {
      currentUser: {
        getIdToken: jasmine.createSpy('getIdToken').and.returnValue(Promise.resolve('mock-token'))
      }
    };

    TestBed.configureTestingModule({
      providers: [
        WarmupService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Auth, useValue: mockAuth }
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

  it('should ping the backend deep warmup endpoint and set isWarmedUp to true upon successful response', fakeAsync(() => {
    service.pingBackend();
    expect(service.isWarmingUp()).toBeTrue();

    const req = httpMock.expectOne(warmupUrl);
    expect(req.request.method).toBe('GET');
    req.flush('{"status":"UP","firestore":"WARMED","pdfbox":"WARMED"}');

    expect(service.isWarmingUp()).toBeFalse();
    expect(service.isWarmedUp()).toBeTrue();
    expect(service.lastPingTimestamp()).toBeTruthy();
  }));

  it('should tolerate 404 or 401 error and still mark backend as awake', fakeAsync(() => {
    service.pingBackend();

    const req = httpMock.expectOne(warmupUrl);
    req.flush('Not Found', { status: 404, statusText: 'Not Found' });

    expect(service.isWarmingUp()).toBeFalse();
    expect(service.isWarmedUp()).toBeTrue();
    expect(service.lastPingTimestamp()).toBeTruthy();
  }));

  it('should start keep alive, ping periodically and refresh auth token', fakeAsync(() => {
    service.startKeepAlive(1); // 1 minute interval for testing

    // First immediate ping
    const req1 = httpMock.expectOne(warmupUrl);
    req1.flush('{"status":"UP"}');

    // Fast-forward 1 minute
    tick(60000);

    const req2 = httpMock.expectOne(warmupUrl);
    req2.flush('{"status":"UP"}');

    expect(service.isWarmedUp()).toBeTrue();
    expect(mockAuth.currentUser.getIdToken).toHaveBeenCalledWith(false);
    service.stopKeepAlive();
  }));
});
