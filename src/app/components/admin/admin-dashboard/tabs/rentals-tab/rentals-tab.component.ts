import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import { Customer, Rental, RentalService, Vehicle } from '../../../../../services/rental.service';

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
  availableVehicles: Vehicle[] = [];
  availableCustomers: Customer[] = [];

  isModalOpen = false;
  newRental: any = { location: 'Mottola', status: 'Prenotato' };

  ngOnInit() {
    this.rentals$ = this.selectedLocation$.pipe(
      switchMap(loc => this.rentalService.getRentals(loc === 'Tutte' ? undefined : loc))
    );
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
    this.rentalService.getCustomers().subscribe(c => this.availableCustomers = c);
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newRental = { location: 'Mottola', status: 'Prenotato' }; }

  async saveRental() {
    if (!this.newRental.vehicleId || !this.newRental.customerId || !this.newRental.startDate) return;

    const selectedCar = this.availableVehicles.find(v => v.id === this.newRental.vehicleId);
    const selectedCustomer = this.availableCustomers.find(c => c.id === this.newRental.customerId);

    const rentalToSave: Rental = {
      ...this.newRental,
      customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : 'Cliente non trovato',
      vehiclePlate: selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.plate})` : 'Veicolo non trovato',
      startDate: new Date(this.newRental.startDate) as any,
      endDate: new Date(this.newRental.endDate) as any
    };

    // Calcolo stato iniziale automatico
    rentalToSave.status = this.rentalService.calculateStatus(rentalToSave);

    await this.rentalService.createRental(rentalToSave);
    this.closeModal();
  }

  async updateStatus(id: string, status: any) {
    await this.rentalService.updateRental(id, { status });
  }

  async deleteRental(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo noleggio?')) {
      await this.rentalService.deleteRental(id);
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
