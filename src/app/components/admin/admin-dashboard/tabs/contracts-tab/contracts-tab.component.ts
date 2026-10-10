import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, tap } from 'rxjs';
import { RentalService, ContractDocument, Customer, Vehicle, Rental, Company } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { WarmupService } from '../../../../../services/warmup.service';
import { Timestamp } from '@angular/fire/firestore';
import { API_CONFIG } from '../../../../../config/api.config';
import { CustomerSelectComponent } from "../../../../../shared/customer-select/customer-select.component";
import { VehicleSelectComponent } from "../../../../../shared/vehicle-select/vehicle-select.component";

@Component({
  selector: 'app-contracts-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerSelectComponent, VehicleSelectComponent],
  templateUrl: './contracts-tab.component.html',
  styleUrls: ['./contracts-tab.component.scss']
})
export class ContractsTabComponent implements OnInit {
  private rentalService = inject(RentalService);
  private loadingService = inject(LoadingService);
  private warmupService = inject(WarmupService);

  contracts$!: Observable<ContractDocument[]>;
  allContracts: ContractDocument[] = [];
  searchTerm = '';
  statusFilter: 'ALL' | 'SENT' | 'FAILED' | 'NOT_SENT' = 'ALL';
  sortField: 'date' | 'contractNumber' | 'customerName' = 'date';
  sortDirection: 'asc' | 'desc' = 'desc';

  currentPage = 1;
  itemsPerPage = 10;

  toggleSortDirection() {
    this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    this.currentPage = 1;
  }
  isGeneratingContract: { [key: string]: boolean } = {};
  isCheckingContract: { [key: string]: boolean } = {};
  isSendingContract: { [key: string]: boolean } = {};

  availableCustomers: Customer[] = [];
  availableCompanies: Company[] = [];
  availableVehicles: Vehicle[] = [];
  allRentals: Rental[] = [];

  companySearchTerm = '';
  isCompanyDropdownOpen = false;
  editedContractDate = '';
  editedRentalStartDate = '';
  editedRentalEndDate = '';

  isEditModalOpen = false;
  editingContract: ContractDocument | null = null;
  editedDetails: any = {};

  // --- STATO MODALE CONTRATTO DI RIFERIMENTO (RIF) ---
  isReferenceModalOpen = false;
  sourceContractForReference: ContractDocument | null = null;
  rifContractNumber = '';
  rifVehicleId = '';
  rifCustomerId = '';
  rifDetails: any = {};
  rifDate = '';
  rifRentalStartDate = '';
  rifRentalEndDate = '';
  rifCompanySearchTerm = '';
  isRifCompanyDropdownOpen = false;
  updateCalendarRental = true;
  isGeneratingRif = false;
  rifRentalStartDateManuallyEdited = false;

  selectedContractIds = new Set<string>();
  modifiedContractNumbers = new Set<string>();
  isSendingBulk = false;

  ngOnInit() {
    this.warmupService.pingBackend();
    this.loadingService.show();
    this.contracts$ = this.rentalService.getContracts().pipe(
      tap({
        next: (contracts) => {
          this.allContracts = contracts || [];
          this.loadingService.hide();
        },
        error: (err) => {
          console.error('Error loading contracts:', err);
          this.loadingService.hide();
        }
      })
    );
    
    // Cache customers list to pass for additional driver select
    this.rentalService.getCustomers().subscribe(custs => {
      this.availableCustomers = custs || [];
    });

    // Cache companies list for autocomplete in edit modal
    this.rentalService.getCompanies().subscribe(companies => {
      this.availableCompanies = companies || [];
    });

    // Cache vehicles list for replacement vehicle selection
    this.rentalService.getVehicles().subscribe(vehicles => {
      this.availableVehicles = vehicles || [];
    });

    // Cache rentals list for editing end dates
    this.rentalService.getRentals().subscribe(rentals => {
      this.allRentals = rentals || [];
    });
  }

  getCustomerDisplayName(contract: ContractDocument): string {
    if (contract.customerName && contract.customerName.trim()) {
      return contract.customerName;
    }
    if (contract.details?.isCompany && contract.details?.companyName) {
      return contract.details.companyName;
    }
    if (contract.customerId && this.availableCustomers && this.availableCustomers.length > 0) {
      const cust = this.availableCustomers.find(c => c.id === contract.customerId);
      if (cust) {
        return `${cust.firstName} ${cust.lastName}`.trim();
      }
    }
    const associatedRental = this.allRentals?.find(r => r.id === contract.rentalId);
    if (associatedRental?.customerName) {
      return associatedRental.customerName;
    }
    return contract.customerName || 'Cliente non specificato';
  }

  getVehicleDisplayName(contract: ContractDocument): string {
    if (contract.vehiclePlate && contract.vehiclePlate.trim()) {
      return contract.vehiclePlate;
    }
    if (contract.vehicleId && this.availableVehicles && this.availableVehicles.length > 0) {
      const veh = this.availableVehicles.find(v => v.id === contract.vehicleId);
      if (veh) {
        return `${veh.brand} ${veh.model} (${veh.plate})`;
      }
    }
    const associatedRental = this.allRentals?.find(r => r.id === contract.rentalId);
    if (associatedRental?.vehiclePlate) {
      return associatedRental.vehiclePlate;
    }
    return contract.vehiclePlate || 'Veicolo non specificato';
  }

  getFilteredContracts(contracts: ContractDocument[] | null): ContractDocument[] {
    if (!contracts) return [];
    
    // 1. Applica Filtro di Ricerca Testuale
    let result = contracts;
    const search = this.searchTerm.toLowerCase().trim();
    if (search) {
      result = result.filter(c => 
        (c.contractNumber || '').toLowerCase().includes(search) ||
        this.getCustomerDisplayName(c).toLowerCase().includes(search) ||
        this.getVehicleDisplayName(c).toLowerCase().includes(search)
      );
    }

    // 2. Applica Filtro di Stato Cargos
    if (this.statusFilter !== 'ALL') {
      result = result.filter(c => {
        if (this.statusFilter === 'SENT') {
          return c.cargos_status === 'SENT';
        } else if (this.statusFilter === 'FAILED') {
          return c.cargos_status === 'FAILED';
        } else if (this.statusFilter === 'NOT_SENT') {
          return !c.cargos_status || (c.cargos_status !== 'SENT' && c.cargos_status !== 'FAILED');
        }
        return true;
      });
    }

    // 3. Applica Ordinamento (Sorting)
    result = [...result].sort((a, b) => {
      let comparison = 0;

      if (this.sortField === 'date') {
        const timeA = a.date ? ((a.date as any).seconds || new Date(a.date as any).getTime()) : 0;
        const timeB = b.date ? ((b.date as any).seconds || new Date(b.date as any).getTime()) : 0;
        comparison = timeA - timeB;
      } else if (this.sortField === 'contractNumber') {
        const cleanA = (a.contractNumber || '').replace(/^RIF\s*/i, '');
        const cleanB = (b.contractNumber || '').replace(/^RIF\s*/i, '');
        const numA = parseInt(cleanA, 10) || 0;
        const numB = parseInt(cleanB, 10) || 0;
        comparison = numA - numB;
        if (comparison === 0) {
          comparison = (a.contractNumber || '').localeCompare(b.contractNumber || '');
        }
      } else if (this.sortField === 'customerName') {
        comparison = this.getCustomerDisplayName(a).localeCompare(this.getCustomerDisplayName(b));
      }

      return this.sortDirection === 'desc' ? -comparison : comparison;
    });

    return result;
  }

  getPaginatedContracts(contracts: ContractDocument[] | null): ContractDocument[] {
    const filtered = this.getFilteredContracts(contracts);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getTotalPages(contracts: ContractDocument[] | null): number {
    const filtered = this.getFilteredContracts(contracts);
    return Math.ceil(filtered.length / this.itemsPerPage);
  }

  editContract(contract: ContractDocument) {
    if (contract.cargos_status === 'SENT') {
      const ok = confirm(
        "Questo contratto è già stato inviato con successo a Cargos.\n\n" +
        "Se intendi allungare i giorni (prolungamento del contratto), procedi pure con la modifica:\n" +
        "salvando con la nuova data di rientro successiva, lo stato verrà azzerato automaticamente e potrai effettuarne di nuovo l'invio a Cargos.\n\n" +
        "Vuoi procedere con la modifica?"
      );
      if (!ok) return;
    }
    this.editingContract = contract;
    this.editedDetails = { ...contract.details };
    this.editedContractDate = this.formatDateForInput(contract.date);
    
    // Recupera la data di inizio e fine noleggio dal noleggio associato o dai dati del contratto
    const associatedRental = this.allRentals.find(r => r.id === contract.rentalId);
    if (associatedRental && associatedRental.startDate) {
      this.editedRentalStartDate = this.formatDateForInput(associatedRental.startDate);
    } else if (contract.contratto_checkout_data) {
      const part = contract.contratto_checkout_data.split(' ')[0];
      this.editedRentalStartDate = this.formatDateForInput(part);
    } else {
      this.editedRentalStartDate = this.editedContractDate;
    }

    if (associatedRental && associatedRental.endDate) {
      this.editedRentalEndDate = this.formatDateForInput(associatedRental.endDate);
    } else if (contract.contratto_checkin_data) {
      const part = contract.contratto_checkin_data.split(' ')[0];
      this.editedRentalEndDate = this.formatDateForInput(part);
    } else {
      this.editedRentalEndDate = '';
    }

    this.companySearchTerm = this.editedDetails.isCompany ? (this.editedDetails.companyName || '') : '';
    this.isCompanyDropdownOpen = false;
    this.isEditModalOpen = true;
  }

  mousedownOnOverlay = false;

  onOverlayMousedown(event: MouseEvent) {
    this.mousedownOnOverlay = event.target === event.currentTarget;
  }

  shouldCloseModal(event: MouseEvent): boolean {
    const shouldClose = this.mousedownOnOverlay && event.target === event.currentTarget;
    this.mousedownOnOverlay = false;
    return shouldClose;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingContract = null;
    this.editedDetails = {};
    this.editedContractDate = '';
    this.editedRentalStartDate = '';
    this.editedRentalEndDate = '';
    this.companySearchTerm = '';
    this.isCompanyDropdownOpen = false;
  }

  get filteredCompanies(): Company[] {
    const term = this.companySearchTerm ? this.companySearchTerm.toLowerCase().trim() : '';
    if (!term) return this.availableCompanies;
    return this.availableCompanies.filter(comp =>
      comp.name.toLowerCase().includes(term) ||
      comp.vat.toLowerCase().includes(term)
    );
  }

  selectCompany(comp: Company) {
    this.editedDetails.companyName = comp.name;
    this.editedDetails.companyVat = comp.vat;
    this.editedDetails.companyAddress = comp.address || '';
    this.editedDetails.companyPhone = comp.phone || '';
    this.editedDetails.companyPec = comp.pec || '';
    this.companySearchTerm = comp.name;
    this.isCompanyDropdownOpen = false;
  }

  clearCompanySearch() {
    this.companySearchTerm = '';
    this.editedDetails.companyName = '';
    this.editedDetails.companyVat = '';
    this.editedDetails.companyAddress = '';
    this.editedDetails.companyPhone = '';
    this.editedDetails.companyPec = '';
  }

  onCompanySearchBlur() {
    setTimeout(() => {
      this.isCompanyDropdownOpen = false;
    }, 250);
  }

  formatDateForInput(val: any): string {
    if (!val) return '';
    try {
      if (typeof val === 'string') {
        if (/^\d{4}-\d{2}-\d{2}$/.test(val)) return val;
        if (val.includes('/')) {
          const parts = val.split('/');
          if (parts.length === 3) return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
        }
      }
      let d: Date;
      if (typeof val?.toDate === 'function') {
        d = val.toDate();
      } else if (val instanceof Date) {
        d = val;
      } else if (typeof val?.seconds === 'number') {
        d = new Date(val.seconds * 1000);
      } else {
        d = new Date(val);
      }
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      console.warn('Errore parsing data per input:', e);
    }
    return '';
  }

  parseDateInputToTimestamp(val: any): Timestamp {
    if (!val) return Timestamp.now();
    if (val instanceof Timestamp) return val;
    if (typeof val?.toDate === 'function') return Timestamp.fromDate(val.toDate());
    if (val instanceof Date) return Timestamp.fromDate(val);
    if (typeof val === 'string') {
      if (/^\d{4}-\d{2}-\d{2}$/.test(val)) {
        const [y, m, d] = val.split('-').map(Number);
        return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
      }
      const d = new Date(val);
      if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
    }
    return Timestamp.now();
  }

  onEditMainDriverChange() {
    const driverId = this.editedDetails.mainDriverId;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.editedDetails.driverBirthPlace = driver.birthPlace || '';
      this.editedDetails.driverBirthDate = this.formatDateForInput(driver.birthDate);
      this.editedDetails.driverLicenseNumber = driver.licenseNumber || '';
      this.editedDetails.driverLicenseIssueDate = this.formatDateForInput(driver.licenseIssueDate);
      this.editedDetails.driverLicenseExpiry = this.formatDateForInput(driver.licenseExpiry);
      this.editedDetails.driverLicenseReleasedBy = driver.licenseReleasedBy || '';
      this.editedDetails.driverLicenseCountry = driver.licenseCountry || 'Italia';
    } else {
      this.editedDetails.driverBirthPlace = '';
      this.editedDetails.driverBirthDate = '';
      this.editedDetails.driverLicenseNumber = '';
      this.editedDetails.driverLicenseIssueDate = '';
      this.editedDetails.driverLicenseExpiry = '';
      this.editedDetails.driverLicenseReleasedBy = '';
      this.editedDetails.driverLicenseCountry = 'Italia';
    }
  }

  onEditAdditionalDriver1Change() {
    const driverId = this.editedDetails.additionalDriver1Id;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.editedDetails.additionalDriver1Address = driver.address || '';
      this.editedDetails.additionalDriver1Phone = driver.phone || '';
    } else {
      this.editedDetails.additionalDriver1Address = '';
      this.editedDetails.additionalDriver1Phone = '';
    }
  }

  onEditAdditionalDriver2Change() {
    const driverId = this.editedDetails.additionalDriver2Id;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.editedDetails.additionalDriver2Address = driver.address || '';
      this.editedDetails.additionalDriver2Phone = driver.phone || '';
    } else {
      this.editedDetails.additionalDriver2Address = '';
      this.editedDetails.additionalDriver2Phone = '';
    }
  }

  async saveContractEdit() {
    if (!this.editingContract || !this.editingContract.id) return;

    try {
      this.loadingService.show();
      let datePostponed = false;
      const associatedRental = this.allRentals.find(r => r.id === this.editingContract!.rentalId);
      if (associatedRental) {
        const rentalUpdates: Partial<Rental> = {};

        if (this.editedRentalStartDate) {
          const oldStartDateStr = this.formatDateForInput(associatedRental.startDate);
          const newStartDateStr = this.editedRentalStartDate;
          if (newStartDateStr !== oldStartDateStr) {
            datePostponed = true;
            rentalUpdates.startDate = this.parseDateInputToTimestamp(newStartDateStr);
          }
        }

        if (this.editedRentalEndDate) {
          const oldEndDateStr = this.formatDateForInput(associatedRental.endDate);
          const newEndDateStr = this.editedRentalEndDate;
          if (newEndDateStr !== oldEndDateStr) {
            if (newEndDateStr > oldEndDateStr) {
              datePostponed = true;
            }
            rentalUpdates.endDate = this.parseDateInputToTimestamp(newEndDateStr);
          }
        }

        if (Object.keys(rentalUpdates).length > 0) {
          await this.rentalService.updateRental(associatedRental.id!, rentalUpdates);
        }
      }

      const birthDateFormatted = this.editedDetails.driverBirthDate 
        ? this.editedDetails.driverBirthDate.split('-').reverse().join('/') 
        : '15/05/1985';

      const cleanTime = (time: string): string => {
        let cleaned = (time || '12:00').replace(/[.,]/g, ':').trim();
        if (cleaned.includes(':')) {
          const parts = cleaned.split(':');
          const hours = parts[0].padStart(2, '0');
          const minutes = parts[1].padEnd(2, '0');
          return `${hours}:${minutes}`;
        }
        return cleaned;
      };

      // Formatta la data di uscita per Cargos
      const checkoutDateStr = this.editedRentalStartDate 
        ? this.editedRentalStartDate.split('-').reverse().join('/') 
        : (this.editingContract.contratto_checkout_data ? this.editingContract.contratto_checkout_data.split(' ')[0] : '20/08/2026');
      const checkoutTimeStr = cleanTime(this.editedDetails.timeOut);

      // Formatta la data di rientro per Cargos se modificata
      const checkinDateStr = this.editedRentalEndDate 
        ? this.editedRentalEndDate.split('-').reverse().join('/') 
        : (this.editingContract.contratto_checkin_data ? this.editingContract.contratto_checkin_data.split(' ')[0] : '25/08/2026');
      const checkinTimeStr = cleanTime(this.editedDetails.timeIn);

      const updatedContract: Partial<ContractDocument> = {
        details: this.editedDetails,

        // Aggiorna anche i campi flat di Cargos a livello root
        contratto_checkout_data: `${checkoutDateStr} ${checkoutTimeStr}`,
        contratto_checkin_data: `${checkinDateStr} ${checkinTimeStr}`,
        conducente_contraente_nascita_luogo: this.editedDetails.driverBirthPlace || 'Mottola',
        conducente_contraente_nascita_data: birthDateFormatted,
        conducente_contraente_patente_numero: this.editedDetails.driverLicenseNumber || 'PA987654321',
        conducente_contraente_patente_luogoril: this.editedDetails.driverLicenseReleasedBy || this.editedDetails.driverBirthPlace || 'Mottola',
        conducente_contraente_patente_luogoril_paese: this.editedDetails.driverLicenseCountry || 'Italia',
        conducente_contraente_docide_numero: this.editedDetails.driverLicenseNumber || 'PA987654321',
        conducente_contraente_docide_luogoril: this.editedDetails.driverLicenseReleasedBy || this.editedDetails.driverBirthPlace || 'Mottola',
        conducente_contraente_docide_luogoril_paese: this.editedDetails.driverLicenseCountry || 'Italia'
      };

      // Se posticipa la data (o se il contratto non era ancora stato inviato), resettiamo lo stato di Cargos.
      // Altrimenti, se anticipa o non cambia la data ed era già SENT, manteniamo lo stato SENT.
      const shouldResetCargos = datePostponed || (this.editingContract.cargos_status !== 'SENT');

      if (shouldResetCargos) {
        updatedContract.cargos_status = null as any;
        updatedContract.cargos_transaction_id = null as any;
        updatedContract.cargos_error = null as any;
        updatedContract.cargos_sync_time = null as any;
        updatedContract.pdfBase64 = null as any;
        updatedContract.pdfUrl = null as any;
      } else {
        // Mantieni lo stato corrente di invio
        updatedContract.cargos_status = this.editingContract.cargos_status;
        updatedContract.cargos_transaction_id = this.editingContract.cargos_transaction_id;
        updatedContract.cargos_error = this.editingContract.cargos_error;
        updatedContract.cargos_sync_time = this.editingContract.cargos_sync_time;
        updatedContract.pdfBase64 = this.editingContract.pdfBase64;
        updatedContract.pdfUrl = this.editingContract.pdfUrl;
      }

      if (this.editedContractDate) {
        const dateObj = this.parseDateInputToTimestamp(this.editedContractDate);
        updatedContract.date = dateObj;
        
        // Aggiorna anche il campo flat per Cargos della data contratto
        const d = dateObj.toDate();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yyyy = d.getFullYear();
        updatedContract.contratto_data = `${dd}/${mm}/${yyyy} 12:00`;
      }

      if (this.editedDetails.mainDriverId) {
        const driver = this.availableCustomers.find(c => c.id === this.editedDetails.mainDriverId);
        if (driver) {
          updatedContract.customerName = `${driver.firstName} ${driver.lastName}`;
        }

        // AGGIORNA ANCHE L'ANAGRAFICA CLIENTE SU FIRESTORE CON I NUOVI DATI MODIFICATI
        const updateData: Partial<Customer> = {};
        if (this.editedDetails.driverBirthPlace) {
          updateData.birthPlace = this.editedDetails.driverBirthPlace;
        }
        if (this.editedDetails.driverBirthDate) {
          updateData.birthDate = Timestamp.fromDate(new Date(this.editedDetails.driverBirthDate));
        }
        if (this.editedDetails.driverLicenseNumber) {
          updateData.licenseNumber = this.editedDetails.driverLicenseNumber;
        }
        if (this.editedDetails.driverLicenseIssueDate) {
          updateData.licenseIssueDate = Timestamp.fromDate(new Date(this.editedDetails.driverLicenseIssueDate));
        }
        if (this.editedDetails.driverLicenseExpiry) {
          updateData.licenseExpiry = Timestamp.fromDate(new Date(this.editedDetails.driverLicenseExpiry));
        }
        if (this.editedDetails.driverLicenseReleasedBy) {
          updateData.licenseReleasedBy = this.editedDetails.driverLicenseReleasedBy;
        }
        if (this.editedDetails.driverLicenseCountry) {
          updateData.licenseCountry = this.editedDetails.driverLicenseCountry;
        }

        if (Object.keys(updateData).length > 0) {
          try {
            await this.rentalService.updateCustomer(this.editedDetails.mainDriverId, updateData);
            
            // Sincronizza la cache locale
            const cachedDriver = this.availableCustomers.find(c => c.id === this.editedDetails.mainDriverId);
            if (cachedDriver) {
              if (updateData.birthPlace) cachedDriver.birthPlace = updateData.birthPlace;
              if (updateData.birthDate) cachedDriver.birthDate = updateData.birthDate;
              if (updateData.licenseNumber) cachedDriver.licenseNumber = updateData.licenseNumber;
              if (updateData.licenseIssueDate) cachedDriver.licenseIssueDate = updateData.licenseIssueDate;
              if (updateData.licenseExpiry) cachedDriver.licenseExpiry = updateData.licenseExpiry;
              if (updateData.licenseReleasedBy) cachedDriver.licenseReleasedBy = updateData.licenseReleasedBy;
              if (updateData.licenseCountry) cachedDriver.licenseCountry = updateData.licenseCountry;
            }
          } catch (custError) {
            console.error("Errore nell'aggiornamento dell'anagrafica cliente da modifica contratto:", custError);
          }
        }
      }

      // Se l'utente ha inserito/modificato dettagli dell'azienda in modifica, la salviamo se non esiste già
      if (this.editedDetails.isCompany && this.editedDetails.companyName && this.editedDetails.companyVat) {
        const nameUpper = this.editedDetails.companyName.trim().toUpperCase();
        const vatTrimmed = this.editedDetails.companyVat.trim().toUpperCase();
        
        const exists = this.availableCompanies.some(comp => 
          comp.name.trim().toUpperCase() === nameUpper || 
          comp.vat.trim().toUpperCase() === vatTrimmed
        );
        
        if (!exists) {
          try {
            const newCompany: Company = {
              name: this.editedDetails.companyName.trim(),
              vat: this.editedDetails.companyVat.trim(),
              address: this.editedDetails.companyAddress?.trim() || '',
              phone: this.editedDetails.companyPhone?.trim() || '',
              pec: this.editedDetails.companyPec?.trim() || ''
            };
            await this.rentalService.addCompany(newCompany);
            console.log('Nuova azienda salvata con successo da modifica contratto!');
          } catch (compError) {
            console.error('Errore durante il salvataggio automatico dell\'azienda da modifica:', compError);
          }
        }
      }

      await this.rentalService.updateContract(this.editingContract.id, updatedContract);
      if (this.editingContract.contractNumber) {
        this.modifiedContractNumbers.add(this.editingContract.contractNumber);
      }
      this.loadingService.hide();
      alert('Contratto modificato con successo! Lo stato di verifica Cargos è stato reimpostato.');
      this.closeEditModal();
    } catch (error) {
      this.loadingService.hide();
      console.error('Errore durante il salvataggio del contratto modificato:', error);
      alert('Si è verificato un errore durante il salvataggio delle modifiche.');
    }
  }

  // --- METODI CONTRATTO DI RIFERIMENTO (RIF) ---
  openReferenceModal(contract: ContractDocument) {
    this.warmupService.pingBackend();
    this.sourceContractForReference = contract;

    const baseNumber = (contract.contractNumber || '').replace(/^RIF\s*/i, '').trim();
    this.rifContractNumber = `RIF ${baseNumber}`;

    this.rifDetails = JSON.parse(JSON.stringify(contract.details || {}));
    this.rifDetails.contractNumber = this.rifContractNumber;

    this.rifVehicleId = contract.vehicleId || '';
    this.rifCustomerId = contract.customerId || '';

    this.rifDate = this.formatDateForInput(new Date());
    this.rifRentalStartDateManuallyEdited = false;

    const associatedRental = this.allRentals.find(r => r.id === contract.rentalId);
    if (associatedRental) {
      const origStart = associatedRental.startDate ? this.formatDateForInput(associatedRental.startDate) : '';
      if (origStart && origStart > this.rifDate) {
        this.rifRentalStartDate = origStart;
      } else {
        this.rifRentalStartDate = this.rifDate;
      }

      if (associatedRental.endDate) {
        this.rifRentalEndDate = this.formatDateForInput(associatedRental.endDate);
      } else {
        this.rifRentalEndDate = this.rifDate;
      }
    } else {
      this.rifRentalStartDate = this.rifDate;
      this.rifRentalEndDate = this.rifDate;
    }

    this.rifCompanySearchTerm = this.rifDetails.isCompany ? (this.rifDetails.companyName || '') : '';
    this.isRifCompanyDropdownOpen = false;
    this.updateCalendarRental = true;
    this.isReferenceModalOpen = true;
  }

  onRifDateChange(newDate: string) {
    this.rifDate = newDate;
    // Se l'utente non ha impostato manualmente una data inizio noleggio differente, sincronizziamo con la data stipula
    if (!this.rifRentalStartDateManuallyEdited) {
      this.rifRentalStartDate = newDate;
    }
  }

  onRifRentalStartDateChange(newDate: string) {
    this.rifRentalStartDate = newDate;
    this.rifRentalStartDateManuallyEdited = true;
  }

  closeReferenceModal() {
    this.isReferenceModalOpen = false;
    this.sourceContractForReference = null;
    this.rifContractNumber = '';
    this.rifVehicleId = '';
    this.rifCustomerId = '';
    this.rifDetails = {};
    this.rifDate = '';
    this.rifRentalStartDate = '';
    this.rifRentalEndDate = '';
    this.rifRentalStartDateManuallyEdited = false;
    this.rifCompanySearchTerm = '';
    this.isRifCompanyDropdownOpen = false;
    this.isGeneratingRif = false;
  }

  onRifVehicleChange() {
    const v = this.availableVehicles.find(veh => veh.id === this.rifVehicleId);
    if (v && v.fuelType) {
      this.rifDetails.vehicleFuelType = v.fuelType;
    }
  }

  onRifMainDriverChange() {
    const driverId = this.rifDetails.mainDriverId;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.rifDetails.driverBirthPlace = driver.birthPlace || '';
      this.rifDetails.driverBirthDate = this.formatDateForInput(driver.birthDate);
      this.rifDetails.driverLicenseNumber = driver.licenseNumber || '';
      this.rifDetails.driverLicenseIssueDate = this.formatDateForInput(driver.licenseIssueDate);
      this.rifDetails.driverLicenseExpiry = this.formatDateForInput(driver.licenseExpiry);
      this.rifDetails.driverLicenseReleasedBy = driver.licenseReleasedBy || '';
      this.rifDetails.driverLicenseCountry = driver.licenseCountry || 'Italia';
    }
  }

  onRifAdditionalDriver1Change() {
    const driverId = this.rifDetails.additionalDriver1Id;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.rifDetails.additionalDriver1Address = driver.address || '';
      this.rifDetails.additionalDriver1Phone = driver.phone || '';
    } else {
      this.rifDetails.additionalDriver1Address = '';
      this.rifDetails.additionalDriver1Phone = '';
    }
  }

  onRifAdditionalDriver2Change() {
    const driverId = this.rifDetails.additionalDriver2Id;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.rifDetails.additionalDriver2Address = driver.address || '';
      this.rifDetails.additionalDriver2Phone = driver.phone || '';
    } else {
      this.rifDetails.additionalDriver2Address = '';
      this.rifDetails.additionalDriver2Phone = '';
    }
  }

  get filteredRifCompanies(): Company[] {
    const term = this.rifCompanySearchTerm ? this.rifCompanySearchTerm.toLowerCase().trim() : '';
    if (!term) return this.availableCompanies;
    return this.availableCompanies.filter(comp =>
      comp.name.toLowerCase().includes(term) ||
      comp.vat.toLowerCase().includes(term)
    );
  }

  selectRifCompany(comp: Company) {
    this.rifDetails.companyName = comp.name;
    this.rifDetails.companyVat = comp.vat;
    this.rifDetails.companyAddress = comp.address || '';
    this.rifDetails.companyPhone = comp.phone || '';
    this.rifDetails.companyPec = comp.pec || '';
    this.rifCompanySearchTerm = comp.name;
    this.isRifCompanyDropdownOpen = false;
  }

  clearRifCompanySearch() {
    this.rifCompanySearchTerm = '';
    this.rifDetails.companyName = '';
    this.rifDetails.companyVat = '';
    this.rifDetails.companyAddress = '';
    this.rifDetails.companyPhone = '';
    this.rifDetails.companyPec = '';
  }

  onRifCompanySearchBlur() {
    setTimeout(() => {
      this.isRifCompanyDropdownOpen = false;
    }, 250);
  }

  async saveAndGenerateReferenceContract() {
    if (!this.sourceContractForReference || !this.rifContractNumber.trim()) {
      alert('Dati mancanti per la creazione del contratto di riferimento.');
      return;
    }

    const selectedVehicle = this.availableVehicles.find(v => v.id === this.rifVehicleId);
    const selectedCustomer = this.availableCustomers.find(c => c.id === (this.rifDetails.mainDriverId || this.sourceContractForReference!.customerId));

    if (!selectedVehicle) {
      alert('Seleziona il nuovo veicolo sostitutivo per il contratto di riferimento.');
      return;
    }

    try {
      this.isGeneratingRif = true;
      this.loadingService.show();

      let rentalIdToLink = this.sourceContractForReference.rentalId;
      const associatedRental = this.allRentals.find(r => r.id === this.sourceContractForReference!.rentalId);

      const stipulationDate = this.rifDate ? this.parseDateInputToTimestamp(this.rifDate) : Timestamp.now();
      const refRentalStartDateTS = this.rifRentalStartDate ? this.parseDateInputToTimestamp(this.rifRentalStartDate) : stipulationDate;
      const refRentalEndDateTS = this.rifRentalEndDate ? this.parseDateInputToTimestamp(this.rifRentalEndDate) : (associatedRental?.endDate || stipulationDate);

      // Se richiesto, crea o aggiorna il noleggio a calendario per il veicolo sostitutivo
      if (this.updateCalendarRental && associatedRental) {
        const replacementRental: Rental = {
          vehicleId: selectedVehicle.id!,
          vehiclePlate: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`,
          customerId: selectedCustomer?.id || associatedRental.customerId,
          customerName: this.rifDetails.isCompany ? (this.rifDetails.companyName || associatedRental.customerName) : (selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : associatedRental.customerName),
          location: associatedRental.location || 'Mottola',
          returnLocation: associatedRental.returnLocation || associatedRental.location || 'Mottola',
          startDate: refRentalStartDateTS,
          endDate: refRentalEndDateTS,
          startPeriod: associatedRental.startPeriod || 'Mat',
          endPeriod: associatedRental.endPeriod || 'Mat',
          totalPrice: this.rifDetails.baseRate ?? associatedRental.totalPrice,
          notes: `Sostituzione veicolo per contratto ${this.rifContractNumber} (veicolo prec: ${this.sourceContractForReference.vehiclePlate})`,
          status: 'In Corso',
          createdAt: Timestamp.now()
        };

        const newRentalRef = await this.rentalService.createRental(replacementRental);
        rentalIdToLink = newRentalRef.id;
      }

      const newContractDoc: ContractDocument = {
        contractNumber: this.rifContractNumber.trim(),
        rentalId: rentalIdToLink,
        customerId: selectedCustomer?.id || this.sourceContractForReference.customerId,
        customerName: this.rifDetails.isCompany ? (this.rifDetails.companyName || '') : (selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : this.sourceContractForReference.customerName),
        vehicleId: selectedVehicle.id || '',
        vehiclePlate: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`,
        date: stipulationDate,
        details: this.rifDetails
      };

      const dummyRentalForCargos: Rental = {
        id: rentalIdToLink,
        vehicleId: selectedVehicle.id || '',
        vehiclePlate: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`,
        customerId: newContractDoc.customerId,
        customerName: newContractDoc.customerName,
        startDate: refRentalStartDateTS,
        endDate: refRentalEndDateTS,
        location: associatedRental?.location || 'Mottola',
        returnLocation: associatedRental?.returnLocation || 'Mottola',
        status: 'In Corso'
      };

      const cargosData = this.rentalService.mapToCargosFormat(
        dummyRentalForCargos,
        selectedVehicle,
        selectedCustomer || { firstName: newContractDoc.customerName, lastName: '' },
        this.rifDetails,
        stipulationDate
      );

      const companyData = (this.rifDetails.isCompany && this.rifDetails.companyName && this.rifDetails.companyVat) ? {
        name: this.rifDetails.companyName.trim(),
        vat: this.rifDetails.companyVat.trim(),
        address: this.rifDetails.companyAddress?.trim() || '',
        phone: this.rifDetails.companyPhone?.trim() || '',
        pec: this.rifDetails.companyPec?.trim() || ''
      } : null;

      const payload = {
        rentalId: rentalIdToLink,
        customerId: newContractDoc.customerId,
        customerName: newContractDoc.customerName,
        vehicleId: selectedVehicle.id || '',
        vehiclePlate: `${selectedVehicle.brand} ${selectedVehicle.model} (${selectedVehicle.plate})`,
        contractNumber: this.rifContractNumber.trim(),
        company: !!this.rifDetails.isCompany,
        details: this.rifDetails,
        customerUpdates: null,
        vehicleFuelType: this.rifDetails.vehicleFuelType || '',
        companyData,
        cargosData
      };

      return new Promise<void>((resolve) => {
        this.rentalService.stipulateContractOnBackend(payload).subscribe({
          next: (res: { pdfBlob: Blob; contractNumber: string }) => {
            const finalNumber = res.contractNumber || this.rifContractNumber.trim();
            const url = window.URL.createObjectURL(res.pdfBlob);
            window.open(url, '_blank');
            this.loadingService.hide();
            this.isGeneratingRif = false;
            this.closeReferenceModal();
            alert(`Contratto di riferimento ${finalNumber} creato con successo ed aperto in una nuova scheda browser!`);
            resolve();
          },
          error: async (err) => {
            console.warn('Stipula RIF su backend non riuscita, esecuzione fallback locale Firestore:', err);
            try {
              const saveResult = await this.rentalService.createContract(newContractDoc, cargosData);
              const finalNumber = saveResult.contractNumber;

              this.rentalService.downloadContractPdf(finalNumber, true).subscribe({
                next: (pdfBlob: Blob) => {
                  const url = window.URL.createObjectURL(pdfBlob);
                  window.open(url, '_blank');
                  this.loadingService.hide();
                  this.isGeneratingRif = false;
                  this.closeReferenceModal();
                  alert(`Contratto di riferimento ${finalNumber} creato con successo ed aperto in una nuova scheda browser!`);
                  resolve();
                },
                error: (pdfErr) => {
                  console.error('Errore durante la generazione del PDF per il contratto di riferimento:', pdfErr);
                  this.loadingService.hide();
                  this.isGeneratingRif = false;
                  this.closeReferenceModal();
                  alert(`Contratto di riferimento ${finalNumber} salvato in archivio, ma si è verificato un errore durante la generazione del PDF dal server.`);
                  resolve();
                }
              });
            } catch (fallbackErr: any) {
              this.loadingService.hide();
              this.isGeneratingRif = false;
              console.error('Errore creazione contratto di riferimento (fallback):', fallbackErr);
              alert(fallbackErr?.message || 'Si è verificato un errore durante la creazione del contratto di riferimento.');
              resolve();
            }
          }
        });
      });
    } catch (error: any) {
      this.loadingService.hide();
      this.isGeneratingRif = false;
      console.error('Errore creazione contratto di riferimento:', error);
      alert(error?.message || 'Si è verificato un errore durante la creazione del contratto di riferimento.');
    }
  }

  toggleSelectContract(contractId: string) {
    if (this.selectedContractIds.has(contractId)) {
      this.selectedContractIds.delete(contractId);
    } else {
      this.selectedContractIds.add(contractId);
    }
  }

  isContractSelected(contractId: string): boolean {
    return this.selectedContractIds.has(contractId);
  }

  isAllSelected(): boolean {
    const filterable = this.getFilteredContracts(this.allContracts).filter(c => c.cargos_status !== 'SENT' && c.id);
    if (filterable.length === 0) return false;
    return filterable.every(c => this.selectedContractIds.has(c.id!));
  }

  toggleSelectAll() {
    const filterable = this.getFilteredContracts(this.allContracts).filter(c => c.cargos_status !== 'SENT' && c.id);
    if (this.isAllSelected()) {
      filterable.forEach(c => this.selectedContractIds.delete(c.id!));
    } else {
      filterable.forEach(c => this.selectedContractIds.add(c.id!));
    }
  }

  sendBulkContracts() {
    const ids = Array.from(this.selectedContractIds);
    if (ids.length === 0) {
      alert('Seleziona almeno un contratto da inviare.');
      return;
    }

    if (!confirm(`Sei sicuro di voler effettuare l'invio cumulativo di ${ids.length} contratti alla Polizia di Stato (Cargos)?`)) {
      return;
    }

    this.isSendingBulk = true;
    this.loadingService.show();
    this.rentalService.sendBulkContracts(ids).subscribe({
      next: (response) => {
        this.isSendingBulk = false;
        this.loadingService.hide();
        this.selectedContractIds.clear();
        alert('Invio cumulativo completato con successo! I contratti sono stati inviati ed elaborati da Cargos.');
      },
      error: (error) => {
        this.isSendingBulk = false;
        this.loadingService.hide();
        console.error('Errore durante l\'invio bulk Cargos:', error);
        alert(`Si è verificato un errore durante l'invio cumulativo a Cargos.\nDettaglio: ${error.message || error}`);
      }
    });
  }

  printContract(contract: ContractDocument, force?: boolean) {
    const shouldForce = force === true || this.modifiedContractNumbers.has(contract.contractNumber);

    // Se il PDF è già salvato su Firebase Storage e non stiamo forzando la rigenerazione,
    // apriamo direttamente il file dalla CDN (50-100ms) senza svegliare o caricare il backend su Render.
    if (contract.pdfUrl && !shouldForce) {
      window.open(contract.pdfUrl, '_blank');
      return;
    }

    if (contract.id) {
      this.isGeneratingContract[contract.id] = true;
    }
    
    this.loadingService.show();
    this.rentalService.downloadContractPdf(contract.contractNumber, shouldForce).subscribe({
      next: (pdfBlob: Blob) => {
        if (shouldForce) {
          this.modifiedContractNumbers.delete(contract.contractNumber);
        }
        const url = window.URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        this.loadingService.hide();
        if (contract.id) {
          this.isGeneratingContract[contract.id] = false;
        }
      },
      error: (error) => {
        console.error('Errore durante il recupero del PDF dal server:', error);
        this.loadingService.hide();
        alert('Si è verificato un errore durante il recupero del contratto PDF dal server.');
        if (contract.id) {
          this.isGeneratingContract[contract.id] = false;
        }
      }
    });
  }

  async deleteContract(contractOrId: ContractDocument | string) {
    let contract: ContractDocument | undefined;
    let contractId: string;

    if (typeof contractOrId === 'string') {
      contractId = contractOrId;
      contract = this.allContracts?.find(c => c.id === contractId || c.contractNumber === contractId);
    } else {
      contract = contractOrId;
      contractId = contract.id || contract.contractNumber;
    }

    const numLabel = contract?.contractNumber ? `(N. ${contract.contractNumber})` : '';
    if (!confirm(`Sei sicuro di voler eliminare definitivamente il contratto ${numLabel} e il relativo noleggio collegato dal calendario? L'operazione non è reversibile.`)) {
      return;
    }
    
    try {
      this.loadingService.show();
      await this.rentalService.deleteContract(contractId, true);
      this.loadingService.hide();
      alert(`Contratto ${numLabel} e relativo noleggio eliminati con successo!`);
    } catch (error) {
      this.loadingService.hide();
      console.error('Errore nell\'eliminazione del contratto:', error);
      alert('Si è verificato un errore durante l\'eliminazione.');
    }
  }

  checkCargos(contractNumber: string) {
    this.isCheckingContract[contractNumber] = true;
    this.loadingService.show();
    this.rentalService.checkCargosContract(contractNumber).subscribe({
      next: (response) => {
        this.isCheckingContract[contractNumber] = false;
        this.loadingService.hide();
        
        // Verifica se la risposta indica la presenza di errori di validazione
        if (response && (response.success === false || (response.errors && response.errors.length > 0))) {
          const errorList = response.errors ? response.errors.join('\n- ') : 'Dati mancanti o non conformi';
          alert(`La verifica Cargos ha rilevato dei problemi nel contratto ${contractNumber}:\n\nCi sono degli errori di validazione:\n- ${errorList}\n\nSi prega di correggere i dati del noleggio/cliente e riprovare.`);
        } else {
          alert(`Verifica Cargos eseguita con successo per il contratto ${contractNumber}!\nIl contratto è sintatticamente e semanticamente CORRETTO e pronto per l'invio.`);
        }
      },
      error: (error) => {
        this.isCheckingContract[contractNumber] = false;
        this.loadingService.hide();
        console.error('Errore durante il check Cargos:', error);
        alert(`Si è verificato un errore durante la chiamata a Cargos (Microservizio non raggiungibile a ${API_CONFIG.baseUrl} o errore server).\nDettaglio: ${error.message || error}`);
      }
    });
  }

  sendCargos(contractNumber: string) {
    if (!confirm(`Sei sicuro di voler effettuare l'invio reale del contratto ${contractNumber} alla Polizia di Stato (Cargos)?`)) {
      return;
    }
    this.isSendingContract[contractNumber] = true;
    this.loadingService.show();
    this.rentalService.sendCargosContract(contractNumber).subscribe({
      next: (response) => {
        this.isSendingContract[contractNumber] = false;
        this.loadingService.hide();
        alert(`Invio reale Cargos completato con successo per il contratto ${contractNumber}!\nContratto inviato ed elaborato.`);
      },
      error: (error) => {
        this.isSendingContract[contractNumber] = false;
        this.loadingService.hide();
        console.error('Errore durante l\'invio reale Cargos:', error);
        alert(`Si è verificato un errore durante l'invio reale a Cargos.\nDettaglio: ${error.message || error}`);
      }
    });
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  }
}