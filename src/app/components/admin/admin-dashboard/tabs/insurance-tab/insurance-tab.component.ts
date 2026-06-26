import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Insurance, RentalService, Vehicle } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

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
  isEditMode = false;
  editingInsuranceId?: string;
  newInsurance: any = {};

  ngOnInit() {
    this.insurances$ = this.rentalService.getInsurances();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal(insurance?: Insurance) {
    if (insurance) {
      this.isEditMode = true;
      this.editingInsuranceId = insurance.id;
      const expiryDate = insurance.expiryDate && (insurance.expiryDate as any).toDate ? (insurance.expiryDate as any).toDate().toISOString().split('T')[0] : '';
      this.newInsurance = { 
        ...insurance,
        expiryDate: expiryDate
      };
    } else {
      this.isEditMode = false;
      this.editingInsuranceId = undefined;
      this.newInsurance = {};
    }
    this.isModalOpen = true;
  }

  closeModal() { this.isModalOpen = false; this.newInsurance = {}; }

  async saveInsurance() {
    if (!this.newInsurance.vehicleId || !this.newInsurance.expiryDate) return;
    try {
      const v = this.availableVehicles.find(x => x.id === this.newInsurance.vehicleId);
      const data: Insurance = {
        ...this.newInsurance,
        vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : (this.newInsurance.vehiclePlate || '?'),
        expiryDate: Timestamp.fromDate(new Date(this.newInsurance.expiryDate))
      };

      if (this.isEditMode && this.editingInsuranceId) {
        await this.rentalService.updateInsurance(this.editingInsuranceId, data);
      } else {
        await this.rentalService.addInsurance(data);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio dell\'assicurazione:', error);
      alert('Si è verificato un errore durante il salvataggio dell\'assicurazione.');
    }
  }

  async deleteInsurance(id: string) {
    if (confirm('Sei sicuro di voler eliminare questa assicurazione?')) {
      try {
        await this.rentalService.deleteInsurance(id);
      } catch (error) {
        console.error('Errore durante l\'eliminazione dell\'assicurazione:', error);
        alert('Si è verificato un errore durante l\'eliminazione dell\'assicurazione.');
      }
    }
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
