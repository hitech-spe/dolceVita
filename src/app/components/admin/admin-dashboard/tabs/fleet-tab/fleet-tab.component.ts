import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import { Insurance, Inspection, Maintenance, RentalService, Vehicle } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-fleet-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './fleet-tab.component.html'
})
export class FleetTabComponent implements OnInit {
  @Input() selectedLocation$!: BehaviorSubject<string>;

  private rentalService = inject(RentalService);

  searchTerm = '';
  sortOrder: 'newest' | 'oldest' | 'brand' = 'newest';

  vehicles$!: Observable<Vehicle[]>;

  isModalOpen = false;
  isEditMode = false;
  editingVehicleId?: string;

  newVehicle: Partial<Vehicle> = { location: 'Mottola', status: 'Attivo', category: 'Auto' };

  // Dettagli opzionali per nuovo veicolo
  newInsurance: Partial<Insurance> = {};
  newInspection: Partial<Inspection> = {};
  newMaintenance: Partial<Maintenance> = {};

  // Campi helper per le date (input type="date" richiede stringa YYYY-MM-DD)
  insuranceExpiryDate = '';
  inspectionExpiryDate = '';
  maintenanceDate = '';

  ngOnInit() {
    this.vehicles$ = this.selectedLocation$.pipe(
      switchMap(loc => this.rentalService.getVehicles(loc === 'Tutte' ? undefined : loc))
    );
  }

  async openModal(vehicle?: Vehicle) {
    if (vehicle) {
      this.isEditMode = true;
      this.editingVehicleId = vehicle.id;
      this.newVehicle = { ...vehicle };

      // Carica dettagli correlati più recenti
      if (vehicle.id) {
        const [ins, insp, maint] = await Promise.all([
          this.rentalService.getLatestInsurance(vehicle.id),
          this.rentalService.getLatestInspection(vehicle.id),
          this.rentalService.getLatestMaintenance(vehicle.id)
        ]);

        if (ins) {
          this.newInsurance = { ...ins };
          this.insuranceExpiryDate = (ins.expiryDate as any).toDate().toISOString().split('T')[0];
        } else {
          this.newInsurance = {};
          this.insuranceExpiryDate = '';
        }

        if (insp) {
          this.newInspection = { ...insp };
          this.inspectionExpiryDate = (insp.expiryDate as any).toDate().toISOString().split('T')[0];
        } else {
          this.newInspection = {};
          this.inspectionExpiryDate = '';
        }

        if (maint) {
          this.newMaintenance = { ...maint };
          this.maintenanceDate = (maint.date as any).toDate().toISOString().split('T')[0];
        } else {
          this.newMaintenance = {};
          this.maintenanceDate = '';
        }
      }
    } else {
      this.isEditMode = false;
      this.editingVehicleId = undefined;
      this.newVehicle = { location: 'Mottola', status: 'Attivo', category: 'Auto' };
      this.newInsurance = {};
      this.newInspection = {};
      this.newMaintenance = {};
      this.insuranceExpiryDate = '';
      this.inspectionExpiryDate = '';
      this.maintenanceDate = '';
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.newVehicle = { location: 'Mottola', status: 'Attivo', category: 'Auto' };
  }

  async saveVehicle() {
    if (!this.newVehicle.brand || !this.newVehicle.plate) return;

    try {
      // Conversione date in Timestamp (valido sia per add che per update)
      if (this.insuranceExpiryDate) {
        this.newInsurance.expiryDate = Timestamp.fromDate(new Date(this.insuranceExpiryDate));
      }
      if (this.inspectionExpiryDate) {
        this.newInspection.expiryDate = Timestamp.fromDate(new Date(this.inspectionExpiryDate));
      }
      if (this.maintenanceDate) {
        this.newMaintenance.date = Timestamp.fromDate(new Date(this.maintenanceDate));
      }

      if (this.isEditMode && this.editingVehicleId) {
        await this.rentalService.updateVehicleWithDetails(
          this.editingVehicleId,
          this.newVehicle,
          this.newInsurance,
          this.newInspection,
          this.newMaintenance
        );
      } else {
        await this.rentalService.addVehicleWithDetails(
          this.newVehicle as Vehicle,
          this.newInsurance,
          this.newInspection,
          this.newMaintenance
        );
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio del veicolo:', error);
      alert('Si è verificato un errore durante il salvataggio del veicolo.');
    }
  }

  async deleteVehicle(id: string) {
    if (confirm('ATTENZIONE: Eliminando questo veicolo verranno eliminati anche tutti i noleggi, assicurazioni, revisioni e manutenzioni collegati. Sei sicuro di voler procedere?')) {
      try {
        await this.rentalService.deleteVehicle(id);
      } catch (error) {
        console.error('Errore durante l\'eliminazione del veicolo:', error);
        alert('Si è verificato un errore durante l\'eliminazione del veicolo.');
      }
    }
  }

  getFiltered(items: Vehicle[] | null): Vehicle[] {
    if (!items) return [];
    let filtered = items
        .filter(i => {
          const brand = i.brand?.toLowerCase() || '';
          const model = i.model?.toLowerCase() || '';
          const plate = i.plate?.toLowerCase() || '';
          const term = this.searchTerm.toLowerCase();
          
          return brand.includes(term) || 
                 model.includes(term) || 
                 plate.includes(term);
        });

    // Applica ordinamento scelto dall'utente
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
        return a.brand.localeCompare(b.brand);
      }
    });
  }
}
