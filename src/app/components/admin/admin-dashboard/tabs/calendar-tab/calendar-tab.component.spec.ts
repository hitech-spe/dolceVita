import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarTabComponent } from './calendar-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { WarmupService } from '../../../../../services/warmup.service';
import { of, throwError } from 'rxjs';
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
      createRental: jasmine.createSpy('createRental').and.returnValue(Promise.resolve({ id: 'new-rent-id' })),
      updateRental: jasmine.createSpy('updateRental').and.returnValue(Promise.resolve()),
      addCustomer: jasmine.createSpy('addCustomer').and.returnValue(Promise.resolve({ id: 'quick-cust-id' })),
      calculateStatus: jasmine.createSpy('calculateStatus').and.returnValue('Prenotato'),
      createContract: jasmine.createSpy('createContract').and.returnValue(Promise.resolve({ contractNumber: '731', id: '731' })),
      downloadContractPdf: jasmine.createSpy('downloadContractPdf').and.returnValue(of(new Blob())),
      stipulateContractOnBackend: jasmine.createSpy('stipulateContractOnBackend').and.returnValue(of({ pdfBlob: new Blob(), contractNumber: '732' })),
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

    it('should automatically delegate contract stipulation to backend and assign atomic number', async () => {
      component.contractDetails.contractNumber = ''; // Nessun codice inserito a mano
      mockRentalService.stipulateContractOnBackend.and.returnValue(of({
        pdfBlob: new Blob(),
        contractNumber: '732'
      }));

      await component.generateContract();

      expect(mockRentalService.stipulateContractOnBackend).toHaveBeenCalledWith(
        jasmine.objectContaining({ contractNumber: '' })
      );
      expect(window.alert).toHaveBeenCalledWith(
        jasmine.stringMatching(/Contratto PDF generato con successo \(N\. 732\)/)
      );
      expect(component.isContractModalOpen).toBeFalse();
    });

    it('should use manual custom contract number when specified by user', async () => {
      component.contractDetails.contractNumber = '1850'; // Codice manuale
      mockRentalService.stipulateContractOnBackend.and.returnValue(of({
        pdfBlob: new Blob(),
        contractNumber: '1850'
      }));

      await component.generateContract();

      expect(mockRentalService.stipulateContractOnBackend).toHaveBeenCalledWith(
        jasmine.objectContaining({ contractNumber: '1850' })
      );
      expect(component.isContractModalOpen).toBeFalse();
    });

    it('should catch error and alert user when stipulateContractOnBackend fails', async () => {
      const serverError = new Error('Errore di connessione backend');
      mockRentalService.stipulateContractOnBackend.and.returnValue(throwError(() => serverError));

      await component.generateContract();

      expect(window.alert).toHaveBeenCalledWith(
        jasmine.stringMatching(/Errore durante la stipula del contratto sul server/)
      );
      expect(component.isGeneratingContract).toBeFalse();
      expect(mockLoadingService.hide).toHaveBeenCalled();
    });

    it('should trigger backend warmup ping when opening contract modal', () => {
      const dummyRental: any = { id: 'rent-99', vehicleId: 'v1', customerId: 'c1' };
      component.openContractModal(dummyRental);
      expect(mockWarmupService.pingBackend).toHaveBeenCalled();
      expect(component.isContractModalOpen).toBeTrue();
    });

    it('should alert and return null if vehicleId is missing when calling saveRentalSilent', async () => {
      component.newRental = { vehicleId: '', startDate: '2026-10-06', customerId: 'c1' };

      const result = await component.saveRentalSilent();
      expect(result).toBeNull();
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/Seleziona un veicolo/));
    });

    it('should alert and return null if customerId is missing when calling saveRentalSilent without quickCustomer', async () => {
      component.newRental = { vehicleId: 'v1', startDate: '2026-10-06', customerId: '' };
      component.isQuickCustomer = false;

      const result = await component.saveRentalSilent();
      expect(result).toBeNull();
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/Seleziona un cliente esistente/));
    });

    it('should prepare rental draft and open contract modal immediately in saveAndStipulateContract', async () => {
      component.newRental = { vehicleId: 'v1', startDate: '2026-10-06', customerId: 'c1', location: 'Mottola' };
      component.availableCustomers = [{ id: 'c1', firstName: 'Mario', lastName: 'Rossi' }];
      component.availableVehicles = [{ id: 'v1', brand: 'Fiat', model: 'Panda', plate: 'AA111BB' } as any];
      component.isRentalModalOpen = true;

      spyOn(component, 'openContractModal').and.callThrough();

      await component.saveAndStipulateContract();

      expect(component.openContractModal).toHaveBeenCalled();
      expect(component.isContractModalOpen).toBeTrue();
      expect(component.isRentalModalOpen).toBeFalse();
      expect(component.contractRental?.vehicleId).toBe('v1');
    });

    it('should send rentalData to backend when contractRental has no id yet', async () => {
      component.contractRental = { vehicleId: 'v1', customerId: 'c1', startDate: '2026-10-06' } as any;
      component.contractVehicle = { id: 'v1', brand: 'Fiat', model: 'Panda', plate: 'AA111BB' } as any;
      component.contractCustomer = { id: 'c1', firstName: 'Mario', lastName: 'Rossi' };
      component.contractDetails = { contractNumber: '' };

      mockRentalService.stipulateContractOnBackend.and.returnValue(of({
        pdfBlob: new Blob(),
        contractNumber: '733'
      }));

      await component.generateContract();

      expect(mockRentalService.stipulateContractOnBackend).toHaveBeenCalledWith(
        jasmine.objectContaining({
          rentalId: '',
          rentalData: jasmine.objectContaining({ vehicleId: 'v1' })
        })
      );
    });

    it('should handle quickCustomer creation in memory and immediately open the contract modal', async () => {
      component.newRental = { vehicleId: 'v1', startDate: '2026-10-06', location: 'Mottola' };
      component.isQuickCustomer = true;
      component.quickCustomer = { firstName: 'Giuseppe', lastName: 'Verdi', phone: '1234567890', address: 'Via Roma 1' };
      component.availableCustomers = [];
      component.availableVehicles = [{ id: 'v1', brand: 'Fiat', model: 'Panda', plate: 'AA111BB' } as any];

      await component.saveAndStipulateContract();

      expect(component.availableCustomers.length).toBeGreaterThan(0);
      expect(component.contractCustomer?.firstName).toBe('Giuseppe');
      expect(component.isContractModalOpen).toBeTrue();
    });
  });
});
