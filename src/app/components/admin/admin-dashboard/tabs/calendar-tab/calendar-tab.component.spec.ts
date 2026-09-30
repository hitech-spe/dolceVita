import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarTabComponent } from './calendar-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { WarmupService } from '../../../../../services/warmup.service';
import { of } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

describe('CalendarTabComponent', () => {
  let component: CalendarTabComponent;
  let fixture: ComponentFixture<CalendarTabComponent>;
  let mockRentalService: any;
  let mockLoadingService: any;
  let mockWarmupService: any;

  beforeEach(async () => {
    mockRentalService = {
      getVehicles: () => of([]),
      getCustomers: () => of([]),
      getCompanies: () => of([]),
      getMaintenances: () => of([]),
      getMaintenancePeriods: () => of([]),
      getTemporaryTransfers: () => of([]),
      getRentals: () => of([]),
      getNextContractNumber: jasmine.createSpy('getNextContractNumber').and.returnValue(of(731)),
      createContract: jasmine.createSpy('createContract').and.returnValue(Promise.resolve({ contractNumber: '731', id: '731' })),
      downloadContractPdf: jasmine.createSpy('downloadContractPdf').and.returnValue(of(new Blob())),
      mapToCargosFormat: jasmine.createSpy('mapToCargosFormat').and.returnValue({})
    };

    mockLoadingService = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide')
    };

    mockWarmupService = {
      pingBackend: jasmine.createSpy('pingBackend')
    };

    await TestBed.configureTestingModule({
      imports: [CalendarTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: LoadingService, useValue: mockLoadingService },
        { provide: WarmupService, useValue: mockWarmupService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CalendarTabComponent);
    component = fixture.componentInstance;
    component.selectedLocation$ = of('All');
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should prioritize maintenance over rentals when they overlap', () => {
    const item = {
      vehicle: { id: 'v123', brand: 'Fiat', model: '500', plate: 'AB123CD', status: 'Attivo' },
      transfers: [],
      maintenances: [
        {
          id: 'm1',
          vehicleId: 'v123',
          startDate: Timestamp.fromDate(new Date('2026-09-22T00:00:00')),
          endDate: Timestamp.fromDate(new Date('2026-09-23T00:00:00')),
          notes: 'Routine maintenance'
        }
      ],
      rentals: [
        {
          id: 'r1',
          vehicleId: 'v123',
          customerName: 'Mario Rossi',
          startDate: Timestamp.fromDate(new Date('2026-09-20T00:00:00')),
          endDate: Timestamp.fromDate(new Date('2026-09-25T00:00:00')),
          status: 'In Corso'
        }
      ]
    };

    // Test non-overlapping day before maintenance
    const dayBefore = new Date('2026-09-21T12:00:00');
    let status = component.getDayStatus(item, dayBefore);
    expect(status.type).toBe('rental');
    expect(status.data.id).toBe('r1');

    // Test overlapping day during maintenance
    const dayDuring = new Date('2026-09-22T12:00:00');
    status = component.getDayStatus(item, dayDuring);
    expect(status.type).toBe('maintenance');
    expect(status.data.id).toBe('m1');

    // Test non-overlapping day after maintenance
    const dayAfter = new Date('2026-09-24T12:00:00');
    status = component.getDayStatus(item, dayAfter);
    expect(status.type).toBe('rental');
    expect(status.data.id).toBe('r1');
  });

  describe('Contract generation and atomic numbering', () => {
    beforeEach(() => {
      spyOn(window, 'alert').and.stub();
      spyOn(window, 'open').and.stub();
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:http://localhost/test');

      component.contractRental = {
        id: 'r1',
        vehicleId: 'v1',
        customerId: 'c1',
        customerName: 'Mario Rossi',
        location: 'Mottola',
        startDate: Timestamp.now(),
        endDate: Timestamp.now(),
        status: 'In Corso'
      };
      component.contractVehicle = {
        id: 'v1',
        brand: 'Fiat',
        model: 'Panda',
        plate: 'AA111BB',
        location: 'Mottola',
        category: 'A',
        status: 'Attivo'
      };
      component.contractCustomer = {
        id: 'c1',
        firstName: 'Mario',
        lastName: 'Rossi',
        phone: '123456789'
      };
      component.contractDetails = {
        contractNumber: '731',
        kmIncluded: 'Senza Limiti',
        timeOut: '10:00',
        timeIn: '18:00'
      };
      component.suggestedContractNumber = '731';
    });

    it('should automatically assign the atomic contract number and download the corresponding PDF', async () => {
      component.contractDetails.contractNumber = ''; // Nessun codice inserito a mano
      mockRentalService.createContract.and.returnValue(Promise.resolve({ contractNumber: '732', id: '732' }));

      await component.generateContract();

      expect(mockRentalService.createContract).toHaveBeenCalledWith(
        jasmine.any(Object),
        jasmine.any(Object)
      );
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('732', true);
      expect(window.alert).toHaveBeenCalledWith(
        jasmine.stringMatching(/Contratto PDF generato con successo \(N\. 732\)/)
      );
      expect(component.isContractModalOpen).toBeFalse();
    });

    it('should use manual custom contract number when specified by user', async () => {
      component.contractDetails.contractNumber = '1850'; // Codice manuale
      mockRentalService.createContract.and.returnValue(Promise.resolve({ contractNumber: '1850', id: '1850' }));

      await component.generateContract();

      expect(mockRentalService.createContract).toHaveBeenCalledWith(
        jasmine.objectContaining({ contractNumber: '1850' }),
        jasmine.any(Object)
      );
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('1850', true);
      expect(component.isContractModalOpen).toBeFalse();
    });

    it('should catch error and alert user when createContract rejects unexpectedly', async () => {
      const dbError = new Error('Errore di connessione Firestore');
      mockRentalService.createContract.and.returnValue(Promise.reject(dbError));

      await component.generateContract();

      expect(window.alert).toHaveBeenCalledWith('Errore di connessione Firestore');
      expect(component.isGeneratingContract).toBeFalse();
      expect(mockLoadingService.hide).toHaveBeenCalled();
    });

    it('should trigger backend warmup ping when opening contract modal', () => {
      const dummyRental: any = { id: 'rent-99', vehicleId: 'v1', customerId: 'c1' };
      component.openContractModal(dummyRental);
      expect(mockWarmupService.pingBackend).toHaveBeenCalled();
      expect(component.isContractModalOpen).toBeTrue();
    });
  });
});
