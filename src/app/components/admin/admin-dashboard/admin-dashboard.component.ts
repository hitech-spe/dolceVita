import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, switchMap, Observable } from 'rxjs';
import {Rental, RentalService, Vehicle} from "../../../services/rental.service";

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent implements OnInit {
  private rentalService = inject(RentalService);

  // Stato della pagina
  currentTab: 'rentals' | 'fleet' = 'rentals';

  // Filtro Sedi (Gestito in tempo reale con RxJS)
  locations = ['Tutte', 'Mottola', 'Massafra', 'Grottaglie'];
  selectedLocation$ = new BehaviorSubject<string>('Tutte');

  // Dati (osservabili che si aggiornano da soli quando cambia il filtro)
  vehicles$!: Observable<Vehicle[]>;
  rentals$!: Observable<Rental[]>;

  // Variabili per le Modali (Finestre a comparsa)
  isVehicleModalOpen = false;
  isRentalModalOpen = false;

  // Modelli temporanei per i form
  newVehicle: Partial<Vehicle> = { location: 'Mottola', status: 'Attivo', category: 'Auto' };
  newRental: any = { location: 'Mottola', status: 'Prenotato' };

  // Lista veicoli caricata per la tendina dei noleggi
  availableVehicles: Vehicle[] = [];

  ngOnInit() {
    // Quando cambia la sede selezionata, aggiorna automaticamente le tabelle!
    this.vehicles$ = this.selectedLocation$.pipe(
        switchMap(loc => this.rentalService.getVehicles(loc === 'Tutte' ? undefined : loc))
    );

    this.rentals$ = this.selectedLocation$.pipe(
        switchMap(loc => this.rentalService.getRentals(loc === 'Tutte' ? undefined : loc))
    );

    // Carica i veicoli per poterli selezionare quando si crea un noleggio
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  changeLocationFilter(loc: string) {
    this.selectedLocation$.next(loc);
  }

  // ---- GESTIONE VEICOLI ----
  openVehicleModal() { this.isVehicleModalOpen = true; }
  closeVehicleModal() { this.isVehicleModalOpen = false; }

  async saveVehicle() {
    if (this.newVehicle.brand && this.newVehicle.plate) {
      await this.rentalService.addVehicle(this.newVehicle as Vehicle);
      this.closeVehicleModal();
      this.newVehicle = { location: 'Mottola', status: 'Attivo', category: 'Auto' }; // Reset
    }
  }

  // ---- GESTIONE NOLEGGI ----
  openRentalModal() { this.isRentalModalOpen = true; }
  closeRentalModal() { this.isRentalModalOpen = false; }

  async saveRental() {
    if (this.newRental.vehicleId && this.newRental.customerName && this.newRental.startDate) {

      // Troviamo l'auto selezionata per salvarne la targa nel noleggio
      const selectedCar = this.availableVehicles.find(v => v.id === this.newRental.vehicleId);

      const rentalToSave: Rental = {
        ...this.newRental,
        vehiclePlate: selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.plate})` : 'Veicolo non trovato',
        // Convertiamo le stringhe del calendario HTML in oggetti Date per Firebase
        startDate: new Date(this.newRental.startDate),
        endDate: new Date(this.newRental.endDate)
      };

      await this.rentalService.createRental(rentalToSave as Rental);
      this.closeRentalModal();
      this.newRental = { location: 'Mottola', status: 'Prenotato' }; // Reset
    }
  }

  // Helper per convertire le date Firestore in stringhe leggibili
  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    // Se è un Timestamp di Firebase
    if (timestamp.toDate) {
      return timestamp.toDate().toLocaleDateString('it-IT');
    }
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
