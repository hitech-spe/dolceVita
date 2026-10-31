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
      expect(res.customerId).toBe('cust-new-999');
      expect(res.pdfBlob).toBeTruthy();
      expect(res.pdfBlob.type).toBe('application/pdf');
    });

    const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/contracts/stipulate`);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);

    req.flush(dummyBlob, {
      headers: {
        'X-Contract-Number': '1816',
        'X-Customer-Id': 'cust-new-999',
        'Content-Type': 'application/pdf'
      }
    });
  });

  describe('Reactive Customer State & Local Updates', () => {
    it('should upsert, update and remove customer in the local observable stream immediately', (done) => {
      const customerA: any = { id: 'cust-1', firstName: 'Mario', lastName: 'Rossi' };
      const customerB: any = { id: 'cust-2', firstName: 'Luigi', lastName: 'Verdi' };

      let emissionsCount = 0;
      service.getCustomers().subscribe(customers => {
        emissionsCount++;
        if (emissionsCount === 1) {
          // Dopo prima emissione (customerA inserito)
          expect(customers.length).toBe(1);
          expect(customers[0].firstName).toBe('Mario');
        } else if (emissionsCount === 2) {
          // Dopo secondo inserimento (customerB)
          expect(customers.length).toBe(2);
          expect(customers.some(c => c.id === 'cust-2')).toBeTrue();
        } else if (emissionsCount === 3) {
          // Dopo aggiornamento di customerA
          const updatedA = customers.find(c => c.id === 'cust-1');
          expect(updatedA?.firstName).toBe('Mario Modificato');
        } else if (emissionsCount === 4) {
          // Dopo rimozione di customerB
          expect(customers.length).toBe(1);
          expect(customers.find(c => c.id === 'cust-2')).toBeUndefined();
          done();
        }
      });

      // 1. Inserimento di customerA
      service.upsertLocalCustomer(customerA);

      // 2. Inserimento di customerB
      service.upsertLocalCustomer(customerB);

      // 3. Modifica di customerA
      service.updateLocalCustomer('cust-1', { firstName: 'Mario Modificato' });

      // 4. Rimozione di customerB
      service.removeLocalCustomer('cust-2');
    });

    it('should immediately add customer to reactive stream upon successful addCustomer', async () => {
      const newCust: any = { firstName: 'Anna', lastName: 'Bianchi', phone: '123' };

      let capturedCustomers: any[] = [];
      service.getCustomers().subscribe(custs => {
        capturedCustomers = custs;
      });

      const addPromise = service.addCustomer(newCust);

      const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/customers`);
      expect(req.request.method).toBe('POST');
      req.flush({ id: 'cust-auto-123', firstName: 'Anna', lastName: 'Bianchi', phone: '123' });

      const result = await addPromise;
      expect(result.id).toBe('cust-auto-123');

      // Verifica aggiornamento ottimistico istantaneo dello stream
      const found = capturedCustomers.find(c => c.id === 'cust-auto-123');
      expect(found).toBeDefined();
      expect(found?.firstName).toBe('Anna');
    });

    it('should preserve existing customer names when stipulating contract with driver updates', (done) => {
      const existingCustomer: any = { id: 'cust-mario', firstName: 'Mario', lastName: 'Rossi', phone: '333111' };
      service.upsertLocalCustomer(existingCustomer);

      const dummyBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      const payload = {
        rentalId: 'rent-123',
        contractNumber: '1817',
        customerId: 'cust-mario',
        customerName: 'Mario Rossi',
        customerUpdates: {
          licenseNumber: 'U999999',
          birthPlace: 'Mottola'
        }
      };

      service.stipulateContractOnBackend(payload).subscribe(() => {
        service.getCustomers().subscribe(customers => {
          const mario = customers.find(c => c.id === 'cust-mario');
          expect(mario).toBeDefined();
          expect(mario?.firstName).toBe('Mario');
          expect(mario?.lastName).toBe('Rossi');
          expect(mario?.licenseNumber).toBe('U999999');
          expect(mario?.birthPlace).toBe('Mottola');
          done();
        });
      });

      const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/contracts/stipulate`);
      req.flush(dummyBlob, {
        headers: {
          'X-Contract-Number': '1817',
          'X-Customer-Id': 'cust-mario',
          'Content-Type': 'application/pdf'
        }
      });
    });

    it('should correctly upsert newly created quick customer upon stipulating contract', (done) => {
      const dummyBlob = new Blob(['%PDF-1.4 test'], { type: 'application/pdf' });
      const payload = {
        rentalId: 'rent-new',
        contractNumber: '1818',
        customerId: '',
        customerName: 'Gianna Nannini',
        customerUpdates: {
          firstName: 'Gianna',
          lastName: 'Nannini',
          phone: '333555777',
          licenseNumber: 'G123456'
        }
      };

      service.stipulateContractOnBackend(payload).subscribe(res => {
        expect(res.customerId).toBe('cust-server-new');
        service.getCustomers().subscribe(customers => {
          const gianna = customers.find(c => c.id === 'cust-server-new');
          expect(gianna).toBeDefined();
          expect(gianna?.firstName).toBe('Gianna');
          expect(gianna?.lastName).toBe('Nannini');
          expect(gianna?.licenseNumber).toBe('G123456');
          done();
        });
      });

      const req = httpMock.expectOne(`${API_CONFIG.baseUrl}/api/v1/contracts/stipulate`);
      req.flush(dummyBlob, {
        headers: {
          'X-Contract-Number': '1818',
          'X-Customer-Id': 'cust-server-new',
          'Content-Type': 'application/pdf'
        }
      });
    });
  });
});
