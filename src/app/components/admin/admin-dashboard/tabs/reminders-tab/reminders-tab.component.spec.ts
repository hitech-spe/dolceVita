import { ComponentFixture, TestBed } from '@angular/core/testing';
import { RemindersTabComponent } from './reminders-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { of } from 'rxjs';
import { Timestamp } from '@angular/fire/firestore';

describe('RemindersTabComponent', () => {
  let component: RemindersTabComponent;
  let fixture: ComponentFixture<RemindersTabComponent>;
  let mockRentalService: any;

  beforeEach(async () => {
    mockRentalService = {
      getReminders: jasmine.createSpy('getReminders').and.returnValue(of([])),
      addReminder: jasmine.createSpy('addReminder').and.returnValue(Promise.resolve()),
      updateReminder: jasmine.createSpy('updateReminder').and.returnValue(Promise.resolve()),
      deleteReminder: jasmine.createSpy('deleteReminder').and.returnValue(Promise.resolve())
    };

    await TestBed.configureTestingModule({
      imports: [RemindersTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(RemindersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should format date correctly', () => {
    const testDate = new Date('2026-08-19T15:30:00');
    const mockTimestamp = Timestamp.fromDate(testDate);
    const formatted = component.formatDate(mockTimestamp);
    
    // Check that it includes "19" and "2026"
    expect(formatted).toContain('19');
    expect(formatted).toContain('2026');
  });

  it('should generate organic tilts', () => {
    const tilt0 = component.getTilt(0);
    const tilt1 = component.getTilt(1);
    
    expect(tilt0).toBe('rotate(-2deg)');
    expect(tilt1).toBe('rotate(1.5deg)');
  });
});