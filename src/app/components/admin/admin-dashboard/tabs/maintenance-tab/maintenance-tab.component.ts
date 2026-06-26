import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Maintenance, RentalService, Vehicle } from '../../../../../services/rental.service';

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
  newMaintenance: any = {};

  ngOnInit() {
    this.maintenances$ = this.rentalService.getMaintenances();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newMaintenance = {}; }

  async saveMaintenance() {
    if (!this.newMaintenance.vehicleId || !this.newMaintenance.date) return;
    const v = this.availableVehicles.find(x => x.id === this.newMaintenance.vehicleId);
    const data: Maintenance = {
      ...this.newMaintenance,
      vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : '?',
      date: new Date(this.newMaintenance.date) as any
    };
    await this.rentalService.addMaintenance(data);
    this.closeModal();
  }

  async deleteMaintenance(id: string) {
    if (confirm('Sei sicuro di voler eliminare questa manutenzione?')) {
      await this.rentalService.deleteMaintenance(id);
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
