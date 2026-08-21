import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { RentalService, ContractDocument, Customer, Vehicle, Rental } from '../../../../../services/rental.service';
import { ContractPdfService } from '../../../../../services/contract-pdf.service';
import { Firestore, doc, getDoc, Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-contracts-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './contracts-tab.component.html',
  styleUrls: ['./contracts-tab.component.scss']
})
export class ContractsTabComponent implements OnInit {
  private rentalService = inject(RentalService);
  private contractPdfService = inject(ContractPdfService);
  private firestore = inject(Firestore);

  contracts$!: Observable<ContractDocument[]>;
  searchTerm = '';
  isGeneratingContract: { [key: string]: boolean } = {};
  isCheckingContract: { [key: string]: boolean } = {};
  isSendingContract: { [key: string]: boolean } = {};

  availableCustomers: Customer[] = [];

  ngOnInit() {
    this.contracts$ = this.rentalService.getContracts();
    
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

  async printContract(contract: ContractDocument) {
    if (contract.id) {
      this.isGeneratingContract[contract.id] = true;
    }
    
    try {
      // 1. Fetch related documents from Firestore
      let rental: Rental;
      let vehicle: Vehicle;
      let customer: Customer;

      // Fetch Rental
      const rentalSnap = await getDoc(doc(this.firestore, `rentals/${contract.rentalId}`));
      if (rentalSnap.exists()) {
        rental = { id: rentalSnap.id, ...rentalSnap.data() } as Rental;
      } else {
        // Fallback mock if deleted
        rental = {
          id: contract.rentalId,
          vehicleId: contract.vehicleId,
          customerId: contract.customerId,
          startDate: contract.details.date || contract.date,
          endDate: contract.details.date || contract.date,
          location: 'Mottola',
          returnLocation: 'Mottola',
          status: 'Concluso',
          customerName: contract.customerName,
          vehiclePlate: contract.vehiclePlate,
          totalPrice: contract.details.baseRate || 0
        };
      }

      // Fetch Vehicle
      const vehicleSnap = await getDoc(doc(this.firestore, `vehicles/${contract.vehicleId}`));
      if (vehicleSnap.exists()) {
        vehicle = { id: vehicleSnap.id, ...vehicleSnap.data() } as Vehicle;
      } else {
        // Fallback mock if deleted
        const plateOnly = contract.vehiclePlate.match(/\((.*?)\)/)?.[1] || 'TARGA';
        const brandModel = contract.vehiclePlate.replace(/\(.*?\)/, '').trim();
        vehicle = {
          id: contract.vehicleId,
          brand: brandModel.split(' ')[0] || 'Veicolo',
          model: brandModel.split(' ').slice(1).join(' ') || 'Noleggio',
          plate: plateOnly,
          category: 'A',
          dailyPrice: 0,
          location: 'Mottola',
          status: 'Attivo'
        };
      }

      // Fetch Customer
      const customerSnap = await getDoc(doc(this.firestore, `customers/${contract.customerId}`));
      if (customerSnap.exists()) {
        customer = { id: customerSnap.id, ...customerSnap.data() } as Customer;
      } else {
        // Fallback mock if deleted
        customer = {
          id: contract.customerId,
          firstName: contract.customerName.split(' ')[0] || 'Cliente',
          lastName: contract.customerName.split(' ').slice(1).join(' ') || 'Storico',
          phone: contract.details.companyPhone || '',
          address: contract.details.companyAddress || ''
        };
      }

      // 2. Generate PDF
      const pdfBlob = await this.contractPdfService.generateContractAndMerge(
        rental,
        vehicle,
        customer,
        contract.details,
        this.availableCustomers
      );

      // 3. Initiate download
      const url = window.URL.createObjectURL(pdfBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `Contratto_Noleggio_${contract.contractNumber}.pdf`;
      link.click();
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Errore durante la rigenerazione del contratto:', error);
      alert('Si è verificato un errore durante la rigenerazione del contratto.');
    } finally {
      if (contract.id) {
        this.isGeneratingContract[contract.id] = false;
      }
    }
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
        alert(`Si è verificato un errore durante la chiamata a Cargos (Microservizio non raggiungibile a localhost:8080 o errore server).\nDettaglio: ${error.message || error}`);
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