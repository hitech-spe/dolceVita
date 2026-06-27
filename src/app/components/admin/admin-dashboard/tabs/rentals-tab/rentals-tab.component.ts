import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import { Customer, Rental, RentalService, Vehicle } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-rentals-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './rentals-tab.component.html',
  styleUrls: ['./rentals-tab.component.scss']
})
export class RentalsTabComponent implements OnInit {
  @Input() selectedLocation$!: BehaviorSubject<string>;

  private rentalService = inject(RentalService);

  rentals$!: Observable<Rental[]>;
  searchTerm = '';
  sortOrder: 'newest' | 'oldest' | 'startDate' = 'newest';
  availableVehicles: Vehicle[] = [];
  availableCustomers: Customer[] = [];

  isModalOpen = false;
  isEditMode = false;
  editingRentalId?: string;
  newRental: any = { location: 'Mottola', status: 'Prenotato' };

  ngOnInit() {
    this.rentals$ = this.selectedLocation$.pipe(
      switchMap(loc => this.rentalService.getRentals(loc === 'Tutte' ? undefined : loc))
    );
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
    this.rentalService.getCustomers().subscribe(c => this.availableCustomers = c);
  }

  openModal(rental?: Rental) {
    if (rental) {
      this.isEditMode = true;
      this.editingRentalId = rental.id;
      // Convertiamo i Timestamp in stringhe YYYY-MM-DD per l'input date
      const startDate = rental.startDate && (rental.startDate as any).toDate ? (rental.startDate as any).toDate().toISOString().split('T')[0] : '';
      const endDate = rental.endDate && (rental.endDate as any).toDate ? (rental.endDate as any).toDate().toISOString().split('T')[0] : '';
      
      this.newRental = { 
        ...rental,
        startDate: startDate,
        endDate: endDate
      };
    } else {
      this.isEditMode = false;
      this.editingRentalId = undefined;
      this.newRental = { location: 'Mottola', status: 'Prenotato' };
    }
    this.isModalOpen = true;
  }

  closeModal() { this.isModalOpen = false; this.newRental = { location: 'Mottola', status: 'Prenotato' }; }

  async saveRental() {
    if (!this.newRental.vehicleId || !this.newRental.customerId || !this.newRental.startDate) return;

    try {
      const selectedCar = this.availableVehicles.find(v => v.id === this.newRental.vehicleId);
      const selectedCustomer = this.availableCustomers.find(c => c.id === this.newRental.customerId);

      const rentalToSave: Rental = {
        ...this.newRental,
        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : (this.newRental.customerName || 'Cliente non trovato'),
        vehiclePlate: selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.plate})` : (this.newRental.vehiclePlate || 'Veicolo non trovato'),
        startDate: Timestamp.fromDate(new Date(this.newRental.startDate)),
        endDate: this.newRental.endDate ? Timestamp.fromDate(new Date(this.newRental.endDate)) : null
      };

      // Calcolo stato iniziale automatico
      rentalToSave.status = this.rentalService.calculateStatus(rentalToSave);

      if (this.isEditMode && this.editingRentalId) {
        await this.rentalService.updateRental(this.editingRentalId, rentalToSave);
      } else {
        await this.rentalService.createRental(rentalToSave);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio del noleggio:', error);
      alert('Si è verificato un errore durante il salvataggio del noleggio.');
    }
  }

  async updateStatus(id: string, status: any) {
    try {
      await this.rentalService.updateRental(id, { status });
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato:', error);
      alert('Si è verificato un errore durante l\'aggiornamento dello stato.');
    }
  }

  async deleteRental(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo noleggio?')) {
      try {
        await this.rentalService.deleteRental(id);
      } catch (error) {
        console.error('Errore durante l\'eliminazione del noleggio:', error);
        alert('Si è verificato un errore durante l\'eliminazione del noleggio.');
      }
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }

  getFiltered(items: Rental[] | null): Rental[] {
    if (!items) return [];
    let filtered = items
        .filter(i => {
          const name = i.customerName?.toLowerCase() || '';
          const plate = i.vehiclePlate?.toLowerCase() || '';
          const term = this.searchTerm.toLowerCase();
          return name.includes(term) || plate.includes(term);
        });

    return filtered.sort((a, b) => {
      if (this.sortOrder === 'newest') {
        const dateA = (a.createdAt as any)?.seconds || 0;
        const dateB = (b.createdAt as any)?.seconds || 0;
        return dateB - dateA;
      } else if (this.sortOrder === 'oldest') {
        const dateA = (a.createdAt as any)?.seconds || 0;
        const dateB = (b.createdAt as any)?.seconds || 0;
        return dateA - dateB;
      } else {
        const dateA = (a.startDate as any)?.seconds || 0;
        const dateB = (b.startDate as any)?.seconds || 0;
        return dateB - dateA;
      }
    });
  }
}
