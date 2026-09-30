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
});
