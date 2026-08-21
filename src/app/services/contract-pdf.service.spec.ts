import { TestBed } from '@angular/core/testing';
import { ContractPdfService } from './contract-pdf.service';

describe('ContractPdfService', () => {
  let service: ContractPdfService;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [ContractPdfService]
    });
    service = TestBed.inject(ContractPdfService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});