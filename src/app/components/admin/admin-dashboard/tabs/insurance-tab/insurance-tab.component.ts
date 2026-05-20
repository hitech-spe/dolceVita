import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Insurance, RentalService, Vehicle } from '../../../../../services/rental.service';

@Component({
  selector: 'app-insurance-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './insurance-tab.component.html'
})
export class InsuranceTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  insurances$!: Observable<Insurance[]>;
  availableVehicles: Vehicle[] = [];

  searchTerm = '';
  sortBy: 'expiryDate' | 'vehiclePlate' = 'expiryDate';

  isModalOpen = false;
  newInsurance: any = {};

  ngOnInit() {
    this.insurances$ = this.rentalService.getInsurances();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newInsurance = {}; }

  async saveInsurance() {
    if (!this.newInsurance.vehicleId || !this.newInsurance.expiryDate) return;
    const v = this.availableVehicles.find(x => x.id === this.newInsurance.vehicleId);
    const data: Insurance = {
      ...this.newInsurance,
      vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : '?',
      expiryDate: new Date(this.newInsurance.expiryDate) as any
    };
    await this.rentalService.addInsurance(data);
    this.closeModal();
  }

  getFiltered(items: Insurance[] | null): Insurance[] {
    if (!items) return [];
    return items
      .filter(i =>
        i.vehiclePlate.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
        i.company.toLowerCase().includes(this.searchTerm.toLowerCase())
      )
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
