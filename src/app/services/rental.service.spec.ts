import { TestBed } from '@angular/core/testing';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideHttpClient } from '@angular/common/http';
import { RentalService } from './rental.service';
import { API_CONFIG } from '../config/api.config';
import { Firestore } from '@angular/fire/firestore';
import { Storage } from '@angular/fire/storage';

describe('RentalService (Backend Contract Endpoints)', () => {
  let service: RentalService;
  let httpMock: HttpTestingController;

  const mockFirestore = {};
  const mockStorage = {};

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        RentalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Firestore, useValue: mockFirestore },
        { provide: Storage, useValue: mockStorage }
      ]
    });
    service = TestBed.inject(RentalService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should call backend to get the next contract number', () => {
    service.getNextContractNumberFromBackend().subscribe(nextNum => {
      expect(nextNum).toBe(1815);
    });

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/contracts/next-number`);
    expect(req.request.method).toBe('GET');
    req.flush({ nextContractNumber: 1815 });
  });

  it('should call backend /api/v1/contracts/stipulate and parse X-Contract-Number header and PDF blob', () => {
    const dummyBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
    const payload = {
      rentalId: 'rent-123',
      contractNumber: ''
    };

    service.stipulateContractOnBackend(payload).subscribe(res => {
      expect(res.contractNumber).toBe('1816');
      expect(res.pdfBlob).toBeTruthy();
      expect(res.pdfBlob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/contracts/stipulate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(dummyBlob, {
      headers: {
        'X-Contract-Number': '1816',
        'Content-Type': 'application/pdf'
      }
    });
  });
});
