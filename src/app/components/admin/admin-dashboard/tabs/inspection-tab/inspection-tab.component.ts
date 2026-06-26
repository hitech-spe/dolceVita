import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Inspection, RentalService, Vehicle } from '../../../../../services/rental.service';

@Component({
  selector: 'app-inspection-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './inspection-tab.component.html'
})
export class InspectionTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  inspections$!: Observable<Inspection[]>;
  availableVehicles: Vehicle[] = [];

  searchTerm = '';
  sortBy: 'expiryDate' | 'vehiclePlate' = 'expiryDate';

  isModalOpen = false;
  newInspection: any = {};

  ngOnInit() {
    this.inspections$ = this.rentalService.getInspections();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newInspection = {}; }

  async saveInspection() {
    if (!this.newInspection.vehicleId || !this.newInspection.expiryDate) return;
    const v = this.availableVehicles.find(x => x.id === this.newInspection.vehicleId);
    const data: Inspection = {
      ...this.newInspection,
      vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : '?',
      expiryDate: new Date(this.newInspection.expiryDate) as any
    };
    await this.rentalService.addInspection(data);
    this.closeModal();
  }

  async deleteInspection(id: string) {
    if (confirm('Sei sicuro di voler eliminare questa revisione?')) {
      await this.rentalService.deleteInspection(id);
    }
  }

  getFiltered(items: Inspection[] | null): Inspection[] {
    if (!items) return [];
    return items
      .filter(i => i.vehiclePlate.toLowerCase().includes(this.searchTerm.toLowerCase()))
      .sort((a, b) =>
        this.sortBy === 'expiryDate'
          ? a.expiryDate.toMillis() - b.expiryDate.toMillis()
          : a.vehiclePlate.localeCompare(b.vehiclePlate)
      );
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
