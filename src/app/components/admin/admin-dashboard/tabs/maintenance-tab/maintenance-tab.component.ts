import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Maintenance, RentalService, Vehicle } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-maintenance-tab',
  standalone: true,
  imports: [CommonModule, FormsModule, CurrencyPipe],
  templateUrl: './maintenance-tab.component.html'
})
export class MaintenanceTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  maintenances$!: Observable<Maintenance[]>;
  availableVehicles: Vehicle[] = [];

  searchTerm = '';
  sortBy: 'date' | 'vehiclePlate' = 'date';

  isModalOpen = false;
  isEditMode = false;
  editingMaintenanceId?: string;
  newMaintenance: any = {};

  ngOnInit() {
    this.maintenances$ = this.rentalService.getMaintenances();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal(maintenance?: Maintenance) {
    if (maintenance) {
      this.isEditMode = true;
      this.editingMaintenanceId = maintenance.id;
      const date = maintenance.date && (maintenance.date as any).toDate ? (maintenance.date as any).toDate().toISOString().split('T')[0] : '';
      this.newMaintenance = { 
        ...maintenance,
        date: date
      };
    } else {
      this.isEditMode = false;
      this.editingMaintenanceId = undefined;
      this.newMaintenance = {};
    }
    this.isModalOpen = true;
  }

  closeModal() { this.isModalOpen = false; this.newMaintenance = {}; }

  async saveMaintenance() {
    if (!this.newMaintenance.vehicleId || !this.newMaintenance.date) return;
    try {
      const v = this.availableVehicles.find(x => x.id === this.newMaintenance.vehicleId);
      const data: Maintenance = {
        ...this.newMaintenance,
        vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : (this.newMaintenance.vehiclePlate || '?'),
        date: Timestamp.fromDate(new Date(this.newMaintenance.date))
      };

      if (this.isEditMode && this.editingMaintenanceId) {
        await this.rentalService.updateMaintenance(this.editingMaintenanceId, data);
      } else {
        await this.rentalService.addMaintenance(data);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio della manutenzione:', error);
      alert('Si è verificato un errore durante il salvataggio della manutenzione.');
    }
  }

  async deleteMaintenance(id: string) {
    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {
      try {
        await this.rentalService.deleteMaintenance(id);
      } catch (error) {
        console.error('Errore durante l\'eliminazione della manutenzione:', error);
        alert('Si è verificato un errore durante l\'eliminazione della manutenzione.');
      }
    }
  }

  getFiltered(items: Maintenance[] | null): Maintenance[] {
    if (!items) return [];
    return items
      .filter(i =>
        i.vehiclePlate.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        i.description.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
      .sort((a, b) =>
        this.sortBy === 'date'
          ? a.date.toMillis() - b.date.toMillis()
          : a.vehiclePlate.localeCompare(b.vehiclePlate)
      );
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
