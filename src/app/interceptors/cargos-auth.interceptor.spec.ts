import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { cargosAuthInterceptor } from './cargos-auth.interceptor';
import { Auth } from '@angular/fire/auth';

describe('CargosAuthInterceptor', () => {
  let httpMock: HttpTestingController;
  let httpClient: HttpClient;
  let mockAuth: any;

  beforeEach(() => {
    mockAuth = {
      currentUser: {
        getIdToken: () => Promise.resolve('mock-firebase-id-token')
      }
    };

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([cargosAuthInterceptor])),
        provideHttpClientTesting(),
        { provide: Auth, useValue: mockAuth }
      ]
    });

    httpClient = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should add Authorization Bearer header for /api/v1/cargos/ requests', fakeAsync(() => {
    let responseReceived = false;
    httpClient.post('/api/v1/cargos/contracts/123/check', {}).subscribe(response => {
      expect(response).toBeTruthy();
      responseReceived = true;
    });

    // Resolve the promise in getIdToken
    tick();

    const req = httpMock.expectOne('/api/v1/cargos/contracts/123/check');
    expect(req.request.headers.has('Authorization')).toBeTrue();
    expect(req.request.headers.get('Authorization')).toBe('Bearer mock-firebase-id-token');
    req.flush({ success: true });

    tick();
    expect(responseReceived).toBeTrue();
  }));

  it('should NOT add Authorization header for non-cargos requests', () => {
    httpClient.get('/api/v1/other/api').subscribe();

    const req = httpMock.expectOne('/api/v1/other/api');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({});
  });

  it('should pass request through unmodified if no user is authenticated', () => {
    mockAuth.currentUser = null;

    httpClient.post('/api/v1/cargos/contracts/123/check', {}).subscribe();

    const req = httpMock.expectOne('/api/v1/cargos/contracts/123/check');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ success: true });
  });
});
