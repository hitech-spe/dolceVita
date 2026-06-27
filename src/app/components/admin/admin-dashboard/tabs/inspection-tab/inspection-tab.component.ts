import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Inspection, RentalService, Vehicle } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

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
  sortOrder: 'newest' | 'oldest' | 'expiryDate' = 'newest';

  isModalOpen = false;
  isEditMode = false;
  editingInspectionId?: string;
  newInspection: any = {};

  ngOnInit() {
    this.inspections$ = this.rentalService.getInspections();
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  openModal(inspection?: Inspection) {
    if (inspection) {
      this.isEditMode = true;
      this.editingInspectionId = inspection.id;
      const expiryDate = inspection.expiryDate && (inspection.expiryDate as any).toDate ? (inspection.expiryDate as any).toDate().toISOString().split('T')[0] : '';
      this.newInspection = { 
        ...inspection,
        expiryDate: expiryDate
      };
    } else {
      this.isEditMode = false;
      this.editingInspectionId = undefined;
      this.newInspection = {};
    }
    this.isModalOpen = true;
  }

  closeModal() { this.isModalOpen = false; this.newInspection = {}; }

  async saveInspection() {
    if (!this.newInspection.vehicleId || !this.newInspection.expiryDate) return;
    try {
      const v = this.availableVehicles.find(x => x.id === this.newInspection.vehicleId);
      const data: Inspection = {
        ...this.newInspection,
        vehiclePlate: v ? `${v.brand} ${v.model} (${v.plate})` : (this.newInspection.vehiclePlate || '?'),
        expiryDate: Timestamp.fromDate(new Date(this.newInspection.expiryDate))
      };

      if (this.isEditMode && this.editingInspectionId) {
        await this.rentalService.updateInspection(this.editingInspectionId, data);
      } else {
        await this.rentalService.addInspection(data);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio della revisione:', error);
      alert('Si è verificato un errore durante il salvataggio della revisione.');
    }
  }

  async deleteInspection(id: string) {
    if (confirm('Sei sicuro di voler eliminare questa revisione?')) {
      try {
        await this.rentalService.deleteInspection(id);
      } catch (error) {
        console.error('Errore durante l\'eliminazione della revisione:', error);
        alert('Si è verificato un errore durante l\'eliminazione della revisione.');
      }
    }
  }

  getFiltered(items: Inspection[] | null): Inspection[] {
    if (!items) return [];
    let filtered = items
      .filter(i => {
        const plate = i.vehiclePlate?.toLowerCase() || '';
        const term = this.searchTerm.toLowerCase();
        return plate.includes(term);
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
        const dateA = (a.expiryDate as any)?.seconds || 0;
        const dateB = (b.expiryDate as any)?.seconds || 0;
        return dateA - dateB; // Scadenza più vicina in alto
      }
    });
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
