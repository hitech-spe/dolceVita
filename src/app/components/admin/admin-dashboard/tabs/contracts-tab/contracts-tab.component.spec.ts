import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ContractsTabComponent } from './contracts-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { ContractPdfService } from '../../../../../services/contract-pdf.service';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

describe('ContractsTabComponent', () => {
  let component: ContractsTabComponent;
  let fixture: ComponentFixture<ContractsTabComponent>;
  let mockRentalService: any;
  let mockContractPdfService: any;
  let mockFirestore: any;

  beforeEach(async () => {
    mockRentalService = {
      getContracts: jasmine.createSpy('getContracts').and.returnValue(of([])),
      getCustomers: jasmine.createSpy('getCustomers').and.returnValue(of([])),
      deleteContract: jasmine.createSpy('deleteContract').and.returnValue(Promise.resolve())
    };

    mockContractPdfService = {
      generateContractAndMerge: jasmine.createSpy('generateContractAndMerge').and.returnValue(Promise.resolve(new Blob()))
    };

    mockFirestore = {};

    await TestBed.configureTestingModule({
      imports: [ContractsTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: ContractPdfService, useValue: mockContractPdfService },
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
});