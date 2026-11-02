import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VerbaliTabComponent } from './verbali-tab.component';
import { RentalService } from '../../../../../services/rental.service';
import { Firestore } from '@angular/fire/firestore';
import { of } from 'rxjs';

describe('VerbaliTabComponent', () => {
  let component: VerbaliTabComponent;
  let fixture: ComponentFixture<VerbaliTabComponent>;
  let mockRentalService: any;
  let mockFirestore: any;

  beforeEach(async () => {
    mockRentalService = {
      getVerbali: jasmine.createSpy('getVerbali').and.returnValue(of([])),
      getContracts: jasmine.createSpy('getContracts').and.returnValue(of([])),
      getRentals: jasmine.createSpy('getRentals').and.returnValue(of([])),
      getCustomers: jasmine.createSpy('getCustomers').and.returnValue(of([])),
      createVerbale: jasmine.createSpy('createVerbale').and.returnValue(Promise.resolve({ id: 'mock-id' })),
      updateVerbale: jasmine.createSpy('updateVerbale').and.returnValue(Promise.resolve()),
      deleteVerbale: jasmine.createSpy('deleteVerbale').and.returnValue(Promise.resolve()),
      sendVerbalePec: jasmine.createSpy('sendVerbalePec').and.returnValue(of({ success: true }))
    };

    mockFirestore = {};

    await TestBed.configureTestingModule({
      imports: [VerbaliTabComponent],
      providers: [
        { provide: RentalService, useValue: mockRentalService },
        { provide: Firestore, useValue: mockFirestore }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(VerbaliTabComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('should reset form correctly', () => {
    component.selectedFileName = 'test.pdf';
    component.violationDateStr = '2026-08-25';
    component.resetForm();
    expect(component.selectedFileName).toBe('');
    expect(component.violationDateStr).toBe('');
    expect(component.newVerbale.plate).toBe('');
  });

  it('should filter verbali based on search term', () => {
    component.verbali = [
      {
        id: 'v1',
        plate: 'AA123BB',
        violationDate: {} as any,
        ticketNumber: 'V-1111',
        authorityName: 'Polizia Locale',
        authorityPec: 'test1@pec.it',
        status: 'Nuovo'
      },
      {
        id: 'v2',
        plate: 'CC456DD',
        violationDate: {} as any,
        ticketNumber: 'V-2222',
        authorityName: 'Carabinieri',
        authorityPec: 'test2@pec.it',
        status: 'Nuovo',
        customerName: 'Mario Rossi'
      }
    ];

    component.searchTerm = 'Rossi';
    let filtered = component.getFilteredVerbali();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('v2');

    component.searchTerm = 'AA123';
    filtered = component.getFilteredVerbali();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('v1');
  });

  it('should filter by UNMATCHED status and calculate getNonAssociatiCount', () => {
    component.verbali = [
      {
        id: 'v1',
        plate: 'AA123BB',
        violationDate: {} as any,
        ticketNumber: 'V-1111',
        authorityName: 'Polizia Locale',
        authorityPec: 'test1@pec.it',
        status: 'Nuovo',
        contractNumber: '101'
      },
      {
        id: 'v2',
        plate: 'CC456DD',
        violationDate: {} as any,
        ticketNumber: 'V-2222',
        authorityName: 'Carabinieri',
        authorityPec: 'test2@pec.it',
        status: 'Nuovo'
      }
    ];

    expect(component.getNonAssociatiCount()).toBe(1);

    component.setStatusFilter('UNMATCHED');
    const filtered = component.getFilteredVerbali();
    expect(filtered.length).toBe(1);
    expect(filtered[0].id).toBe('v2');
  });

  it('should clear search and reset filters correctly', () => {
    component.searchTerm = 'Query';
    component.statusFilter = 'Nuovo';
    component.sortField = 'fineAmount';
    component.sortDirection = 'asc';

    component.clearSearch();
    expect(component.searchTerm).toBe('');

    component.resetFilters();
    expect(component.statusFilter).toBe('ALL');
    expect(component.sortField).toBe('violationDate');
    expect(component.sortDirection).toBe('desc');
  });

  it('should open and close PEC draft modal properly', () => {
    const testVerbale = {
      id: 'v10',
      plate: 'EE789FF',
      violationDate: '2026-10-15' as any,
      violationTime: '14:30',
      ticketNumber: 'TEST-1234',
      authorityName: 'Polizia Locale',
      authorityPec: 'polizia@pec.test.it',
      status: 'Nuovo' as const,
      customerName: 'Giuseppe Verdi',
      contractNumber: '888'
    };

    expect(component.isPecModalOpen).toBeFalse();
    component.openPecModal(testVerbale);

    expect(component.isPecModalOpen).toBeTrue();
    expect(component.selectedVerbaleForPec).toBe(testVerbale);
    expect(component.emailDraft.to).toBe('polizia@pec.test.it');
    expect(component.emailDraft.subject).toContain('TEST-1234');
    expect(component.emailDraft.body).toContain('GIUSEPPE VERDI');

    component.closePecModal();
    expect(component.isPecModalOpen).toBeFalse();
    expect(component.selectedVerbaleForPec).toBeNull();
  });

  it('should send PEC through confirmSendPec and update status', async () => {
    const testVerbale = {
      id: 'v20',
      plate: 'GG000HH',
      violationDate: '2026-10-15' as any,
      ticketNumber: 'TEST-999',
      authorityName: 'Polizia Locale',
      authorityPec: 'polizia@pec.test.it',
      status: 'Nuovo' as const
    };

    component.openPecModal(testVerbale);
    component.confirmSendPec();
    await fixture.whenStable();

    expect(mockRentalService.sendVerbalePec).toHaveBeenCalledWith(jasmine.objectContaining({
      verbaleId: 'v20',
      authorityPec: 'polizia@pec.test.it'
    }));
    expect(mockRentalService.updateVerbale).toHaveBeenCalledWith('v20', jasmine.objectContaining({
      status: 'Inviato'
    }));
    expect(component.isPecModalOpen).toBeFalse();
  });

  describe('Image to PDF conversion and attachment handling', () => {
    let sampleImageFile: File;

    beforeEach(async () => {
      const canvas = document.createElement('canvas');
      canvas.width = 10;
      canvas.height = 10;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#2563eb';
        ctx.fillRect(0, 0, 10, 10);
      }
      const imageBlob = await new Promise<Blob>((resolve) => canvas.toBlob(b => resolve(b!), 'image/jpeg'));
      sampleImageFile = new File([imageBlob], 'foto_verbale.jpg', { type: 'image/jpeg' });
    });

    it('should convert an image into a valid PDF document', async () => {
      const result = await component.convertImageToPdf(sampleImageFile);
      expect(result).toBeTruthy();
      expect(result.pdfFile.name).toBe('foto_verbale.pdf');
      expect(result.pdfFile.type).toBe('application/pdf');
      expect(result.pdfBase64).toContain('data:application/pdf');
    });

    it('should reject non-PDF and non-image files in onPecVerbalePdfSelected', async () => {
      spyOn(window, 'alert');
      const invalidFile = new File(['text content'], 'documento.txt', { type: 'text/plain' });
      const event = { target: { files: [invalidFile], value: 'fake' } };

      await component.onPecVerbalePdfSelected(event);

      expect(window.alert).toHaveBeenCalledWith(jasmine.stringMatching(/PDF o immagine/));
      expect(component.attachedVerbaleBase64).toBe('');
    });

    it('should accept image file in onPecVerbalePdfSelected, convert to PDF, and update draft state', async () => {
      const testVerbale = {
        id: 'v30',
        plate: 'ZZ999YY',
        violationDate: '2026-10-15' as any,
        ticketNumber: 'TEST-IMG-1',
        authorityName: 'Polizia Locale',
        authorityPec: 'polizia@pec.test.it',
        status: 'Nuovo' as const
      };
      component.openPecModal(testVerbale);

      const event = { target: { files: [sampleImageFile], value: 'fake' } };
      await component.onPecVerbalePdfSelected(event);

      expect(component.attachedVerbaleFileName).toBe('foto_verbale.pdf');
      expect(component.attachedVerbaleBase64).toContain('data:application/pdf');
      expect(component.emailDraft.attachVerbale).toBeTrue();
      expect(mockRentalService.updateVerbale).toHaveBeenCalledWith('v30', jasmine.objectContaining({
        pdfBase64: jasmine.stringMatching(/data:application\/pdf/)
      }));
    });

    it('should accept image file in onFileSelected, convert to PDF, and add to selectedFiles', async () => {
      expect(component.selectedFiles.length).toBe(0);
      const event = { target: { files: [sampleImageFile], value: 'fake' } };

      await component.onFileSelected(event);

      expect(component.selectedFiles.length).toBe(1);
      expect(component.selectedFiles[0].name).toBe('foto_verbale.pdf');
      expect(component.selectedFiles[0].type).toBe('application/pdf');
    });
  });
});
