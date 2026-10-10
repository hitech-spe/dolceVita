import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsTabComponent } from './contracts-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { WarmupService } from '../../../../../services/warmup.service';
import { Firestore } from '@angular/fire/firestore';
import { of, throwError } from 'rxjs';

describe('ContractsTabComponent', () => {
  let component: ContractsTabComponent;
  let fixture: ComponentFixture<ContractsTabComponent>;
  let mockRentalService: any;
  let mockWarmupService: any;
  let mockFirestore: any;

  beforeEach(async () => {
    mockRentalService = {
      getContracts: jasmine.createSpy('getContracts').and.returnValue(of([])),
      getCustomers: jasmine.createSpy('getCustomers').and.returnValue(of([])),
      getCompanies: jasmine.createSpy('getCompanies').and.returnValue(of([])),
      getVehicles: jasmine.createSpy('getVehicles').and.returnValue(of([])),
      getRentals: jasmine.createSpy('getRentals').and.returnValue(of([])),
      createRental: jasmine.createSpy('createRental').and.returnValue(Promise.resolve({ id: 'new-rental-id' })),
      createContract: jasmine.createSpy('createContract').and.returnValue(Promise.resolve({ contractNumber: 'RIF 100', id: 'RIF 100' })),
      mapToCargosFormat: jasmine.createSpy('mapToCargosFormat').and.returnValue({}),
      updateRental: jasmine.createSpy('updateRental').and.returnValue(Promise.resolve()),
      addCompany: jasmine.createSpy('addCompany').and.returnValue(Promise.resolve()),
      deleteContract: jasmine.createSpy('deleteContract').and.returnValue(Promise.resolve()),
      updateContract: jasmine.createSpy('updateContract').and.returnValue(Promise.resolve()),
      sendBulkContracts: jasmine.createSpy('sendBulkContracts').and.returnValue(of([])),
      downloadContractPdf: jasmine.createSpy('downloadContractPdf').and.returnValue(of(new Blob())),
      stipulateContractOnBackend: jasmine.createSpy('stipulateContractOnBackend').and.returnValue(of({ pdfBlob: new Blob(['pdf']), contractNumber: 'RIF 1790' }))
    };

    mockWarmupService = {
      pingBackend: jasmine.createSpy('pingBackend').and.returnValue(of('OK')),
      startKeepAlive: jasmine.createSpy('startKeepAlive'),
      stopKeepAlive: jasmine.createSpy('stopKeepAlive')
    };

    mockFirestore = {};

    await TestBed.configureTestingModule({
      imports: [ContractsTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: WarmupService, useValue: mockWarmupService },
        { provide: Firestore, useValue: mockFirestore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(ContractsTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should filter contracts correctly', () => {
    const mockContracts = [
      {
        id: '1',
        contractNumber: '70459',
        rentalId: 'r1',
        customerId: 'c1',
        customerName: 'Mario Rossi',
        vehicleId: 'v1',
        vehiclePlate: 'Fiat 500 (FX015NM)',
        date: {} as any,
        details: {}
      },
      {
        id: '2',
        contractNumber: '22345',
        rentalId: 'r2',
        customerId: 'c2',
        customerName: 'La Dolce Vita S.r.l.',
        vehicleId: 'v2',
        vehiclePlate: 'Alfa Romeo (AA111BB)',
        date: {} as any,
        details: {}
      }
    ];

    component.searchTerm = '70459';
    let filtered = component.getFilteredContracts(mockContracts);
    expect(filtered.length).toBe(1);
    expect(filtered[0].customerName).toBe('Mario Rossi');

    component.searchTerm = 'Alfa';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered.length).toBe(1);
    expect(filtered[0].contractNumber).toBe('22345');
  });

  it('should filter by cargos status and sort correctly', () => {
    const mockContracts = [
      {
        id: '1',
        contractNumber: '10',
        customerName: 'Zaira Rossi',
        cargos_status: 'SENT',
        date: { seconds: 1000 } as any,
        details: {}
      },
      {
        id: '2',
        contractNumber: '5',
        customerName: 'Mario Bianchi',
        cargos_status: 'FAILED',
        date: { seconds: 5000 } as any,
        details: {}
      },
      {
        id: '3',
        contractNumber: '20',
        customerName: 'Alessandro Verdi',
        cargos_status: undefined,
        date: { seconds: 2000 } as any,
        details: {}
      }
    ] as any[];

    // Test Cargo filter
    component.statusFilter = 'SENT';
    let filtered = component.getFilteredContracts(mockContracts);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('1');

    component.statusFilter = 'FAILED';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('2');

    component.statusFilter = 'NOT_SENT';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('3');

    // Reset Cargo filter
    component.statusFilter = 'ALL';

    // Test Sort by Contract Number Desc
    component.sortField = 'contractNumber';
    component.sortDirection = 'desc';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered[0].contractNumber).toBe('20');
    expect(filtered[1].contractNumber).toBe('10');
    expect(filtered[2].contractNumber).toBe('5');

    // Test Sort by Contract Number Asc
    component.sortDirection = 'asc';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered[0].contractNumber).toBe('5');
    expect(filtered[1].contractNumber).toBe('10');
    expect(filtered[2].contractNumber).toBe('20');

    // Test Sort by Customer Name Asc
    component.sortField = 'customerName';
    component.sortDirection = 'asc';
    filtered = component.getFilteredContracts(mockContracts);
    expect(filtered[0].customerName).toBe('Alessandro Verdi');
    expect(filtered[1].customerName).toBe('Mario Bianchi');
    expect(filtered[2].customerName).toBe('Zaira Rossi');
  });

  it('should initialize editing state correctly unless cargos_status is SENT', () => {
    const mockContractSent = {
      id: 'c1',
      contractNumber: '100',
      cargos_status: 'SENT',
      details: { baseRate: 150 }
    } as any;

    const mockContractUnsent = {
      id: 'c2',
      contractNumber: '101',
      cargos_status: 'CHECK_SUCCESS',
      details: { baseRate: 120 }
    } as any;

    // SENT contract should not be editable if user cancels confirmation
    spyOn(window, 'confirm').and.returnValue(false);
    component.editContract(mockContractSent);
    expect(component.isEditModalOpen).toBeFalse();
    expect(window.confirm).toHaveBeenCalled();

    // Unsent contract should be editable
    component.editContract(mockContractUnsent);
    expect(component.isEditModalOpen).toBeTrue();
    expect(component.editingContract).toBe(mockContractUnsent);
    expect(component.editedDetails.baseRate).toBe(120);
  });

  it('should auto-populate driver details on driver change', () => {
    component.availableCustomers = [
      {
        id: 'cust_999',
        firstName: 'Franco',
        lastName: 'Neri',
        birthPlace: 'Mottola',
        birthDate: { toDate: () => new Date('1990-01-01') } as any,
        licenseNumber: 'PAT123',
        licenseIssueDate: { toDate: () => new Date('2010-01-01') } as any,
        licenseExpiry: { toDate: () => new Date('2030-01-01') } as any,
        licenseReleasedBy: 'MCTC',
        licenseCountry: 'Italia'
      }
    ];

    component.editedDetails = { mainDriverId: 'cust_999' };
    component.onEditMainDriverChange();

    expect(component.editedDetails.driverBirthPlace).toBe('Mottola');
    expect(component.editedDetails.driverBirthDate).toBe('1990-01-01');
    expect(component.editedDetails.driverLicenseNumber).toBe('PAT123');
    expect(component.editedDetails.driverLicenseCountry).toBe('Italia');
  });

  it('should save edited contract, updating customerName and resetting Cargos status', async () => {
    component.availableCustomers = [
      { id: 'c_xyz', firstName: 'Luigi', lastName: 'Bianchi' }
    ];

    const mockContract = {
      id: 'c_id_1',
      contractNumber: '555',
      details: { baseRate: 100, mainDriverId: 'c_xyz' }
    } as any;

    component.editingContract = mockContract;
    component.editedDetails = { baseRate: 190, mainDriverId: 'c_xyz' };
    component.isEditModalOpen = true;

    await component.saveContractEdit();

    expect(mockRentalService.updateContract).toHaveBeenCalledWith('c_id_1', jasmine.objectContaining({
      details: { baseRate: 190, mainDriverId: 'c_xyz' },
      cargos_status: null as any,
      cargos_transaction_id: null as any,
      cargos_error: null as any,
      cargos_sync_time: null as any,
      pdfBase64: null as any,
      customerName: 'Luigi Bianchi'
    }));
    expect(component.isEditModalOpen).toBeFalse();
  });

  it('should format and update contratto_checkout_data and normalize time inputs during save', async () => {
    const mockContract = {
      id: 'c_id_2',
      contractNumber: '666',
      contratto_checkout_data: '15/08/2026 09.00',
      contratto_checkin_data: '22/08/2026 18.00',
      details: { baseRate: 100, mainDriverId: 'c_xyz', timeOut: '08.30', timeIn: '18.15' }
    } as any;

    component.editingContract = mockContract;
    component.editedDetails = { ...mockContract.details };
    component.isEditModalOpen = true;

    await component.saveContractEdit();

    expect(mockRentalService.updateContract).toHaveBeenCalledWith('c_id_2', jasmine.objectContaining({
      contratto_checkout_data: '15/08/2026 08:30',
      contratto_checkin_data: '22/08/2026 18:15',
    }));
  });

  it('should manage bulk selections and trigger bulk sending correctly', () => {
    const mockContracts = [
      { id: '1', contractNumber: '100', cargos_status: 'CHECK_SUCCESS' },
      { id: '2', contractNumber: '101', cargos_status: 'SENT' },
      { id: '3', contractNumber: '102', cargos_status: 'FAILED' }
    ] as any[];

    component.allContracts = mockContracts;

    // Single selection toggling
    component.toggleSelectContract('1');
    expect(component.isContractSelected('1')).toBeTrue();
    expect(component.isContractSelected('2')).toBeFalse();

    component.toggleSelectContract('1');
    expect(component.isContractSelected('1')).toBeFalse();

    // Select-all logic (excluding already SENT)
    component.toggleSelectAll();
    expect(component.isAllSelected()).toBeTrue();
    expect(component.isContractSelected('1')).toBeTrue();
    expect(component.isContractSelected('2')).toBeFalse();
    expect(component.isContractSelected('3')).toBeTrue();

    // Deselect-all logic
    component.toggleSelectAll();
    expect(component.isAllSelected()).toBeFalse();
    expect(component.isContractSelected('1')).toBeFalse();
    expect(component.isContractSelected('3')).toBeFalse();

    // Bulk Send
    component.toggleSelectContract('1');
    component.toggleSelectContract('3');
    spyOn(window, 'confirm').and.returnValue(true);
    spyOn(window, 'alert');

    component.sendBulkContracts();

    expect(mockRentalService.sendBulkContracts).toHaveBeenCalledWith(['1', '3']);
    expect(component.isSendingBulk).toBeFalse();
    expect(component.selectedContractIds.size).toBe(0);
  });

  it('should paginate contracts correctly', () => {
    const mockContracts = Array.from({ length: 25 }, (_, i) => ({
      id: String(i + 1),
      contractNumber: String(100 + i),
      customerName: `Customer ${i + 1}`,
      date: { seconds: 1000 + i } as any,
      details: {}
    })) as any[];

    component.itemsPerPage = 10;
    component.currentPage = 1;

    let paginated = component.getPaginatedContracts(mockContracts);
    expect(paginated.length).toBe(10);
    // Since default sorting is date desc, items are returned in reverse order
    expect(paginated[0].id).toBe('25');

    component.currentPage = 2;
    paginated = component.getPaginatedContracts(mockContracts);
    expect(paginated.length).toBe(10);
    expect(paginated[0].id).toBe('15');

    component.currentPage = 3;
    paginated = component.getPaginatedContracts(mockContracts);
    expect(paginated.length).toBe(5);

    expect(component.getTotalPages(mockContracts)).toBe(3);
  });

  it('should only allow modal closing if mousedown and mouseup are both on the overlay', () => {
    const dummyOverlay = document.createElement('div');
    const dummyCard = document.createElement('div');
    dummyOverlay.appendChild(dummyCard);

    // Case 1: Mousedown on card, Click/Mouseup on overlay (drag-out scenario)
    let mousedownEvent = { target: dummyCard, currentTarget: dummyOverlay } as any;
    let clickEvent = { target: dummyOverlay, currentTarget: dummyOverlay } as any;

    component.onOverlayMousedown(mousedownEvent);
    let shouldClose = component.shouldCloseModal(clickEvent);
    expect(shouldClose).toBeFalse();

    // Case 2: Mousedown on overlay, Click/Mouseup on overlay (intentional click on backdrop)
    mousedownEvent = { target: dummyOverlay, currentTarget: dummyOverlay } as any;
    clickEvent = { target: dummyOverlay, currentTarget: dummyOverlay } as any;

    component.onOverlayMousedown(mousedownEvent);
    shouldClose = component.shouldCloseModal(clickEvent);
    expect(shouldClose).toBeTrue();
  });

  describe('printContract with cache and force support', () => {
    const dummyContract: any = {
      id: 'doc-123',
      contractNumber: '10042',
      details: {}
    };

    beforeEach(() => {
      spyOn(window, 'open');
      spyOn(window.URL, 'createObjectURL').and.returnValue('blob:http://localhost/test');
      mockRentalService.downloadContractPdf.calls.reset();
    });

    it('should download with force: false by default for unchanged contract', () => {
      component.printContract(dummyContract);
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('10042', false);
    });

    it('should download with force: true when explicit force is provided (e.g. shift-click)', () => {
      component.printContract(dummyContract, true);
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('10042', true);
    });

    it('should automatically force regenerate if contract was modified, then revert to cache on subsequent print', async () => {
      component.editingContract = { ...dummyContract };
      component.editedDetails = { baseRate: 150 };
      spyOn(window, 'alert');

      await component.saveContractEdit();

      expect(component.modifiedContractNumbers.has('10042')).toBeTrue();

      // First print after edit should force regenerate
      component.printContract(dummyContract);
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('10042', true);
      expect(component.modifiedContractNumbers.has('10042')).toBeFalse();

      mockRentalService.downloadContractPdf.calls.reset();

      // Subsequent print should use cached PDF (force: false)
      component.printContract(dummyContract);
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('10042', false);
    });

    it('should open directly from Firebase Storage URL if pdfUrl exists and force is false', () => {
      const contractWithUrl: any = {
        ...dummyContract,
        pdfUrl: 'https://firebasestorage.googleapis.com/v0/b/test-bucket/contracts%2F10042.pdf'
      };

      component.printContract(contractWithUrl);

      expect(window.open).toHaveBeenCalledWith('https://firebasestorage.googleapis.com/v0/b/test-bucket/contracts%2F10042.pdf', '_blank');
      expect(mockRentalService.downloadContractPdf).not.toHaveBeenCalled();
    });

    it('should bypass pdfUrl and call backend when force: true is explicitly provided', () => {
      const contractWithUrl: any = {
        ...dummyContract,
        pdfUrl: 'https://firebasestorage.googleapis.com/v0/b/test-bucket/contracts%2F10042.pdf'
      };

      component.printContract(contractWithUrl, true);

      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('10042', true);
    });
  });

  describe('Reference Contract (RIF) functionality', () => {
    const originalContract: any = {
      id: 'c-100',
      contractNumber: '1790',
      rentalId: 'rental-orig-1',
      customerId: 'cust-1',
      customerName: 'Mario Rossi',
      vehicleId: 'veh-old',
      vehiclePlate: 'Fiat Panda (AB123CD)',
      date: { seconds: 1700000000 },
      details: {
        baseRate: 50,
        kmIncluded: '2999 km totali',
        fuelLevel: '12/12',
        mainDriverId: 'cust-1'
      }
    };

    beforeEach(() => {
      component.availableVehicles = [
        { id: 'veh-new', brand: 'Jeep', model: 'Renegade', plate: 'XY987ZT', location: 'Mottola', category: 'SUV', status: 'Attivo', fuelType: 'Diesel' }
      ];
      component.allRentals = [
        { id: 'rental-orig-1', vehicleId: 'veh-old', customerId: 'cust-1', customerName: 'Mario Rossi', startDate: { toDate: () => new Date('2026-09-01') } as any, endDate: { toDate: () => new Date('2026-09-10') } as any, location: 'Mottola', status: 'In Corso' }
      ];
    });

    it('should initialize reference modal with prefix RIF and prefilled details from original contract', () => {
      component.openReferenceModal(originalContract);

      expect(component.isReferenceModalOpen).toBeTrue();
      expect(component.sourceContractForReference).toBe(originalContract);
      expect(component.rifContractNumber).toBe('RIF 1790');
      expect(component.rifDetails.baseRate).toBe(50);
      expect(component.rifDetails.contractNumber).toBe('RIF 1790');
      expect(component.rifRentalStartDate).toBe(component.rifDate);
      expect(component.rifRentalEndDate).toBe('2026-09-10');
    });

    it('should save and generate reference contract PDF successfully via backend stipulation', async () => {
      spyOn(window, 'alert');
      spyOn(window, 'open');

      component.openReferenceModal(originalContract);
      component.rifVehicleId = 'veh-new';

      await component.saveAndGenerateReferenceContract();

      expect(mockRentalService.stipulateContractOnBackend).toHaveBeenCalledWith(
        jasmine.objectContaining({
          contractNumber: 'RIF 1790',
          vehicleId: 'veh-new'
        })
      );
      expect(component.isReferenceModalOpen).toBeFalse();
    });

    it('should fallback to createContract and downloadContractPdf if backend stipulation fails', async () => {
      spyOn(window, 'alert');
      spyOn(window, 'open');

      mockRentalService.stipulateContractOnBackend.and.returnValue(throwError(() => new Error('Backend offline')));
      mockRentalService.createContract.and.callFake((doc: any) => Promise.resolve({ contractNumber: doc.contractNumber, id: doc.contractNumber }));

      component.openReferenceModal(originalContract);
      component.rifVehicleId = 'veh-new';

      await component.saveAndGenerateReferenceContract();

      expect(mockRentalService.createContract).toHaveBeenCalledWith(
        jasmine.objectContaining({
          contractNumber: 'RIF 1790',
          vehicleId: 'veh-new'
        }),
        jasmine.any(Object)
      );
      expect(mockRentalService.downloadContractPdf).toHaveBeenCalledWith('RIF 1790', true);
      expect(component.isReferenceModalOpen).toBeFalse();
    });

    it('should sort RIF contracts alongside their numeric counter', () => {
      const contracts: any[] = [
        { id: '1', contractNumber: '1791', customerName: 'A' },
        { id: '2', contractNumber: 'RIF 1790', customerName: 'B' },
        { id: '3', contractNumber: '1790', customerName: 'C' }
      ];

      component.sortField = 'contractNumber';
      component.sortDirection = 'asc';

      const sorted = component.getFilteredContracts(contracts);
      expect(sorted[0].contractNumber).toBe('1790');
      expect(sorted[1].contractNumber).toBe('RIF 1790');
      expect(sorted[2].contractNumber).toBe('1791');
    });

    it('should synchronize rifRentalStartDate when rifDate changes unless manually edited', () => {
      component.openReferenceModal(originalContract);
      expect(component.rifRentalStartDateManuallyEdited).toBeFalse();

      component.onRifDateChange('2026-10-09');
      expect(component.rifRentalStartDate).toBe('2026-10-09');

      component.onRifRentalStartDateChange('2026-10-15');
      expect(component.rifRentalStartDateManuallyEdited).toBeTrue();
      expect(component.rifRentalStartDate).toBe('2026-10-15');

      component.onRifDateChange('2026-10-12');
      expect(component.rifRentalStartDate).toBe('2026-10-15');
    });

    it('should correctly format local dates for HTML input without UTC day shift', () => {
      const dateLocal = new Date(2026, 9, 9, 0, 0, 0); // Oct 9, 2026 local
      expect(component.formatDateForInput(dateLocal)).toBe('2026-10-09');

      expect(component.formatDateForInput('2026-10-09')).toBe('2026-10-09');
      expect(component.formatDateForInput('09/10/2026')).toBe('2026-10-09');
    });
  });

  describe('Contract and linked rental deletion', () => {
    it('should call rentalService.deleteContract with deleteAssociatedRental=true when confirmed', async () => {
      spyOn(window, 'confirm').and.returnValue(true);
      spyOn(window, 'alert');
      mockRentalService.deleteContract.and.returnValue(Promise.resolve());

      const contractToDelete: any = {
        id: '1854',
        contractNumber: '1854',
        rentalId: 'rent-1854'
      };

      await component.deleteContract(contractToDelete);

      expect(mockRentalService.deleteContract).toHaveBeenCalledWith('1854', true);
      expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/Contratto \(N\. 1854\) e relativo noleggio eliminati con successo!/));
    });

    it('should NOT call rentalService.deleteContract if user cancels confirmation', async () => {
      spyOn(window, 'confirm').and.returnValue(false);
      mockRentalService.deleteContract.calls.reset();

      const contractToDelete: any = { id: '1854', contractNumber: '1854' };
      await component.deleteContract(contractToDelete);

      expect(mockRentalService.deleteContract).not.toHaveBeenCalled();
    });
  });
});