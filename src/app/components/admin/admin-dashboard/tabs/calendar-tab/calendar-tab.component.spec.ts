import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CalendarTabComponent } from './calendar-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { of } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

describe('CalendarTabComponent', () => {
  let component: CalendarTabComponent;
  let fixture: ComponentFixture<CalendarTabComponent>;
  let mockRentalService: any;
  let mockLoadingService: any;

  beforeEach(async () => {
    mockRentalService = {
      getVehicles: () => of([]),
      getCustomers: () => of([]),
      getCompanies: () => of([]),
      getMaintenances: () => of([]),
      getMaintenancePeriods: () => of([]),
      getTemporaryTransfers: () => of([]),
      getRentals: () => of([])
    };

    mockLoadingService = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide')
    };

    await TestBed.configureTestingModule({
      imports: [CalendarTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: LoadingService, useValue: mockLoadingService }
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
});
