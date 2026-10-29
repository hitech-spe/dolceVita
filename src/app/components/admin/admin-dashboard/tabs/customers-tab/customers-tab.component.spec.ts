import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomersTabComponent } from './customers-tab.component';
import { RentalService, CustomerAttachment } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { of } from 'rxjs';

describe('CustomersTabComponent', () => {
  let component: CustomersTabComponent;
  let fixture: ComponentFixture<CustomersTabComponent>;
  let mockRentalService: any;
  let mockLoadingService: any;

  beforeEach(async () => {
    mockRentalService = {
      getCustomers: jasmine.createSpy('getCustomers').and.returnValue(of([])),
      refreshCustomers: jasmine.createSpy('refreshCustomers').and.returnValue(Promise.resolve([])),
      updateCustomer: jasmine.createSpy('updateCustomer').and.returnValue(Promise.resolve()),
      addCustomer: jasmine.createSpy('addCustomer').and.returnValue(Promise.resolve()),
      deleteCustomer: jasmine.createSpy('deleteCustomer').and.returnValue(Promise.resolve()),
      uploadCustomerDocument: jasmine.createSpy('uploadCustomerDocument').and.returnValue(
        Promise.resolve({
          name: 'patente.pdf',
          url: 'https://firebasestorage.googleapis.com/v0/b/dolcevita-2a909.firebasestorage.app/o/customer-documents%2Fcust-1%2Fpatente.pdf',
          path: 'customer-documents/cust-1/patente.pdf',
          type: 'application/pdf'
        } as CustomerAttachment)
      ),
      deleteCustomerDocument: jasmine.createSpy('deleteCustomerDocument').and.returnValue(Promise.resolve())
    };

    mockLoadingService = {
      show: jasmine.createSpy('show'),
      hide: jasmine.createSpy('hide')
    };

    await TestBed.configureTestingModule({
      imports: [CustomersTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: LoadingService, useValue: mockLoadingService }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(CustomersTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('Storage attachments handling', () => {
    it('should open directly in a new tab when attachment has a Firebase Storage url', () => {
      spyOn(window, 'open');
      const storageAttachment: CustomerAttachment = {
        name: 'carta_identita.pdf',
        url: 'https://firebasestorage.googleapis.com/v0/b/dolcevita-2a909.firebasestorage.app/o/doc.pdf',
        path: 'customer-documents/cust-1/doc.pdf'
      };

      component.downloadAttachment(storageAttachment);

      expect(window.open).toHaveBeenCalledWith(storageAttachment.url, '_blank');
    });

    it('should upload document to Firebase Storage and update customer attachments', async () => {
      const dummyCustomer: any = {
        id: 'cust-1',
        firstName: 'Luigi',
        lastName: 'Verdi',
        attachments: []
      };

      const file = new File(['dummy content'], 'patente.pdf', { type: 'application/pdf' });
      const event = { target: { files: [file], value: 'fakepath' } };

      await component.onFileSelected(event, dummyCustomer);

      expect(mockRentalService.uploadCustomerDocument).toHaveBeenCalledWith('cust-1', file);
      expect(mockRentalService.updateCustomer).toHaveBeenCalledWith('cust-1', {
        attachments: [
          jasmine.objectContaining({
            name: 'patente.pdf',
            url: jasmine.stringMatching(/firebasestorage/),
            path: 'customer-documents/cust-1/patente.pdf'
          })
        ]
      });
      expect(event.target.value).toBe('');
    });

    it('should remove attachment from Firebase Storage and update customer document', async () => {
      const dummyCustomer: any = {
        id: 'cust-1',
        firstName: 'Luigi',
        lastName: 'Verdi',
        attachments: [
          {
            name: 'doc1.pdf',
            url: 'https://firebasestorage.googleapis.com/...',
            path: 'customer-documents/cust-1/doc1.pdf'
          }
        ]
      };

      await component.removeAttachment(dummyCustomer, 0);

      expect(mockRentalService.deleteCustomerDocument).toHaveBeenCalledWith('customer-documents/cust-1/doc1.pdf');
      expect(mockRentalService.updateCustomer).toHaveBeenCalledWith('cust-1', { attachments: [] });
    });
  });

  describe('Customer creation and list navigation', () => {
    it('should alert if firstName or lastName is missing in saveCustomer', async () => {
      spyOn(window, 'alert');
      component.newCustomer = { firstName: '', lastName: 'Rossi' };

      await component.saveCustomer();

      expect(window.alert).toHaveBeenCalledWith('Inserisci Nome e Cognome per il cliente.');
      expect(mockRentalService.addCustomer).not.toHaveBeenCalled();
    });

    it('should save new customer, reset page to 1, clear searchTerm, and close modal', async () => {
      component.newCustomer = {
        firstName: ' Mario ',
        lastName: ' Rossi ',
        phone: '123456789',
        birthDate: '1990-05-20'
      };
      component.currentPage = 3;
      component.searchTerm = 'VecchioFiltro';
      component.isModalOpen = true;

      await component.saveCustomer();

      expect(mockRentalService.addCustomer).toHaveBeenCalledWith(jasmine.objectContaining({
        firstName: 'Mario',
        lastName: 'Rossi',
        phone: '123456789'
      }));
      expect(component.currentPage).toBe(1);
      expect(component.searchTerm).toBe('');
      expect(component.sortOrder).toBe('newest');
      expect(component.isModalOpen).toBeFalse();
      expect(component.isSaving).toBeFalse();
    });

    it('should prevent concurrent submissions when isSaving is true', async () => {
      component.isSaving = true;
      component.newCustomer = { firstName: 'Mario', lastName: 'Rossi' };

      await component.saveCustomer();

      expect(mockRentalService.addCustomer).not.toHaveBeenCalled();
    });

    it('should correctly sort customers by newest using robust timestamp extraction', () => {
      const customers: any[] = [
        { id: '1', firstName: 'A', lastName: 'Old', createdAt: { seconds: 1000 } },
        { id: '2', firstName: 'B', lastName: 'New', createdAt: { seconds: 5000 } },
        { id: '3', firstName: 'C', lastName: 'Date', createdAt: new Date('2026-10-14T10:00:00Z') }
      ];

      component.sortOrder = 'newest';
      const sorted = component.getFiltered(customers);

      expect(sorted[0].id).toBe('3'); // Date is 2026 (highest seconds)
      expect(sorted[1].id).toBe('2'); // 5000
      expect(sorted[2].id).toBe('1'); // 1000
    });

    it('should call rentalService.refreshCustomers and manage loading state', async () => {
      await component.refreshCustomers();

      expect(mockLoadingService.show).toHaveBeenCalled();
      expect(mockRentalService.refreshCustomers).toHaveBeenCalled();
      expect(mockLoadingService.hide).toHaveBeenCalled();
      expect(component.isRefreshing).toBeFalse();
    });

    it('should correctly format dates for input across string, timestamp, and seconds formats', () => {
      expect(component.formatDateForInput('1985-05-12')).toBe('1985-05-12');
      expect(component.formatDateForInput('12/05/1985')).toBe('1985-05-12');
      expect(component.formatDateForInput({ seconds: 484747200 })).toBe('1985-05-12');
      expect(component.formatDateForInput({ toDate: () => new Date(1985, 4, 12) })).toBe('1985-05-12');
      expect(component.formatDateForInput(null)).toBe('');
      expect(component.formatDateForInput('')).toBe('');
    });

    it('should correctly open modal and preserve string/timestamp/seconds birthDate and license dates', () => {
      const customerWithStringDates: any = {
        id: 'c-str',
        firstName: 'Mario',
        lastName: 'Rossi',
        birthDate: '1985-05-12',
        licenseNumber: 'AB1234567',
        licenseIssueDate: '2015-05-12',
        licenseExpiry: '2025-05-12'
      };

      component.openModal(customerWithStringDates);

      expect(component.isEditMode).toBeTrue();
      expect(component.editingCustomerId).toBe('c-str');
      expect(component.newCustomer.birthDate).toBe('1985-05-12');
      expect(component.newCustomer.licenseNumber).toBe('AB1234567');
      expect(component.newCustomer.licenseIssueDate).toBe('2015-05-12');
      expect(component.newCustomer.licenseExpiry).toBe('2025-05-12');

      const customerWithSecondsDates: any = {
        id: 'c-sec',
        firstName: 'Luigi',
        lastName: 'Verdi',
        birthDate: { seconds: 484747200 }, // 1985-05-12
        licenseNumber: 'XY9876543',
        licenseExpiry: { seconds: 1747051200 } // 2025-05-12
      };

      component.openModal(customerWithSecondsDates);

      expect(component.newCustomer.birthDate).toBe('1985-05-12');
      expect(component.newCustomer.licenseExpiry).toBe('2025-05-12');
      expect(component.newCustomer.licenseNumber).toBe('XY9876543');
    });

    it('should format dates properly in formatDate helper', () => {
      expect(component.formatDate('1985-05-12')).toBe('12/05/1985');
      expect(component.formatDate({ seconds: 484747200 })).toBe('12/05/1985');
      expect(component.formatDate(null)).toBe('-');
    });
  });
});
