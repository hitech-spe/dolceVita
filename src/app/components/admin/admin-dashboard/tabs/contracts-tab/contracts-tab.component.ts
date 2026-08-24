import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, tap } from 'rxjs';
import { RentalService, ContractDocument, Customer, Vehicle, Rental } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';
import { API_CONFIG } from '../../../../../config/api.config';
import { CustomerSelectComponent } from "../../../../../shared/customer-select/customer-select.component";

@Component({
  selector: 'app-contracts-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CustomerSelectComponent],
  templateUrl: './contracts-tab.component.html',
  styleUrls: ['./contracts-tab.component.scss']
})
export class ContractsTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  contracts$!: Observable<ContractDocument[]>;
  allContracts: ContractDocument[] = [];
  searchTerm = '';
  isGeneratingContract: { [key: string]: boolean } = {};
  isCheckingContract: { [key: string]: boolean } = {};
  isSendingContract: { [key: string]: boolean } = {};

  availableCustomers: Customer[] = [];

  isEditModalOpen = false;
  editingContract: ContractDocument | null = null;
  editedDetails: any = {};

  selectedContractIds = new Set<string>();
  isSendingBulk = false;

  ngOnInit() {
    this.contracts$ = this.rentalService.getContracts().pipe(
      tap(contracts => {
        this.allContracts = contracts || [];
      })
    );
    
    // Cache customers list to pass for additional driver select
    this.rentalService.getCustomers().subscribe(custs => {
      this.availableCustomers = custs;
    });
  }

  getFilteredContracts(contracts: ContractDocument[] | null): ContractDocument[] {
    if (!contracts) return [];
    
    const search = this.searchTerm.toLowerCase().trim();
    if (!search) return contracts;

    return contracts.filter(c => {
      return (
        c.contractNumber.toLowerCase().includes(search) ||
        c.customerName.toLowerCase().includes(search) ||
        c.vehiclePlate.toLowerCase().includes(search)
      );
    });
  }

  editContract(contract: ContractDocument) {
    if (contract.cargos_status === 'SENT') {
      alert('Non puoi modificare un contratto che è già stato inviato con successo a Cargos!');
      return;
    }
    this.editingContract = contract;
    this.editedDetails = { ...contract.details };
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.editingContract = null;
    this.editedDetails = {};
  }

  onEditMainDriverChange() {
    const driverId = this.editedDetails.mainDriverId;
    const driver = this.availableCustomers.find(c => c.id === driverId);
    if (driver) {
      this.editedDetails.driverBirthPlace = driver.birthPlace || '';
      this.editedDetails.driverBirthDate = driver.birthDate && (driver.birthDate as any).toDate ? (driver.birthDate as any).toDate().toISOString().split('T')[0] : '';
      this.editedDetails.driverLicenseNumber = driver.licenseNumber || '';
      this.editedDetails.driverLicenseIssueDate = driver.licenseIssueDate && (driver.licenseIssueDate as any).toDate ? (driver.licenseIssueDate as any).toDate().toISOString().split('T')[0] : '';
      this.editedDetails.driverLicenseExpiry = driver.licenseExpiry && (driver.licenseExpiry as any).toDate ? (driver.licenseExpiry as any).toDate().toISOString().split('T')[0] : '';
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
      const updatedContract: Partial<ContractDocument> = {
        details: this.editedDetails,
        cargos_status: null as any,
        cargos_transaction_id: null as any,
        cargos_error: null as any,
        cargos_sync_time: null as any,
        pdfBase64: null as any
      };

      if (this.editedDetails.mainDriverId) {
        const driver = this.availableCustomers.find(c => c.id === this.editedDetails.mainDriverId);
        if (driver) {
          updatedContract.customerName = `${driver.firstName} ${driver.lastName}`;
        }
      }

      await this.rentalService.updateContract(this.editingContract.id, updatedContract);
      alert('Contratto modificato con successo! Lo stato di verifica Cargos è stato reimpostato.');
      this.closeEditModal();
    } catch (error) {
      console.error('Errore durante il salvataggio del contratto modificato:', error);
      alert('Si è verificato un errore durante il salvataggio delle modifiche.');
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
    this.rentalService.sendBulkContracts(ids).subscribe({
      next: (response) => {
        this.isSendingBulk = false;
        this.selectedContractIds.clear();
        alert('Invio cumulativo completato con successo! I contratti sono stati inviati ed elaborati da Cargos.');
      },
      error: (error) => {
        this.isSendingBulk = false;
        console.error('Errore durante l\'invio bulk Cargos:', error);
        alert(`Si è verificato un errore durante l'invio cumulativo a Cargos.\nDettaglio: ${error.message || error}`);
      }
    });
  }

  printContract(contract: ContractDocument) {
    if (contract.id) {
      this.isGeneratingContract[contract.id] = true;
    }
    
    this.rentalService.downloadContractPdf(contract.contractNumber).subscribe({
      next: (pdfBlob: Blob) => {
        const url = window.URL.createObjectURL(pdfBlob);
        window.open(url, '_blank');
        if (contract.id) {
          this.isGeneratingContract[contract.id] = false;
        }
      },
      error: (error) => {
        console.error('Errore durante il recupero del PDF dal server:', error);
        alert('Si è verificato un errore durante il recupero del contratto PDF dal server.');
        if (contract.id) {
          this.isGeneratingContract[contract.id] = false;
        }
      }
    });
  }

  async deleteContract(id: string) {
    if (!confirm('Sei sicuro di voler eliminare questo contratto dallo storico? L\'operazione non eliminerà il noleggio associato.')) {
      return;
    }
    
    try {
      await this.rentalService.deleteContract(id);
      alert('Contratto eliminato con successo dallo storico!');
    } catch (error) {
      console.error('Errore nell\'eliminazione del contratto:', error);
      alert('Si è verificato un errore durante l\'eliminazione.');
    }
  }

  checkCargos(contractNumber: string) {
    this.isCheckingContract[contractNumber] = true;
    this.rentalService.checkCargosContract(contractNumber).subscribe({
      next: (response) => {
        this.isCheckingContract[contractNumber] = false;
        
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
    this.rentalService.sendCargosContract(contractNumber).subscribe({
      next: (response) => {
        this.isSendingContract[contractNumber] = false;
        alert(`Invio reale Cargos completato con successo per il contratto ${contractNumber}!\nContratto inviato ed elaborato.`);
      },
      error: (error) => {
        this.isSendingContract[contractNumber] = false;
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