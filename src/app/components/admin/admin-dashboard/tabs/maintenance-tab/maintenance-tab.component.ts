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
  sortOrder: 'newest' | 'oldest' | 'date' = 'newest';

  isModalOpen = false;
  isEditMode = false;
  editingMaintenanceId?: string;
  newMaintenance: any = {};

  // Scheda Lavori Stampabile
  isJobSheetOpen = false;
  selectedVehicleForSheet: any = null;
  sheetMaintenances: Maintenance[] = [];
  todayDate = new Date();
  allMaintenances: Maintenance[] = [];
  sheetInlineMaintenance: any = { description: '', date: '', cost: null, km: null, workshop: '' };

  ngOnInit() {
    this.maintenances$ = this.rentalService.getMaintenances();
    this.maintenances$.subscribe(m => {
      this.allMaintenances = m;
      if (this.selectedVehicleForSheet) {
        this.sheetMaintenances = m.filter(x => x.vehicleId === this.selectedVehicleForSheet.id);
      }
    });
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
  }

  getVehicleDisplayName(vehicleId: string): string {
    const v = this.availableVehicles.find(x => x.id === vehicleId);
    if (v) return `${v.brand} ${v.model} (${v.plate})`;
    return '?';
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
    let filtered = items
      .filter(i => {
        const plate = i.vehiclePlate?.toLowerCase() || '';
        const desc = i.description?.toLowerCase() || '';
        const workshop = i.workshop?.toLowerCase() || '';
        const term = this.searchTerm.toLowerCase();
        return plate.includes(term) || desc.includes(term) || workshop.includes(term);
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
        const dateA = (a.date as any)?.seconds || 0;
        const dateB = (b.date as any)?.seconds || 0;
        return dateB - dateA; // Più recente in alto
      }
    });
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }

  openJobSheet(vehicleId: string) {
    const vehicle = this.availableVehicles.find(x => x.id === vehicleId);
    if (!vehicle) return;
    this.selectedVehicleForSheet = vehicle;
    this.sheetMaintenances = this.allMaintenances.filter(m => m.vehicleId === vehicleId);
    this.todayDate = new Date();
    this.isJobSheetOpen = true;
  }

  closeJobSheet() {
    this.isJobSheetOpen = false;
    this.selectedVehicleForSheet = null;
    this.sheetMaintenances = [];
  }

  getSheetTotalCost(): number {
    return this.sheetMaintenances.reduce((sum, m) => sum + (m.cost || 0), 0);
  }

  getMaxKm(): string {
    const kms = this.sheetMaintenances.map(m => m.km || 0).filter(k => k > 0);
    if (kms.length === 0) return '-';
    return Math.max(...kms).toLocaleString('it-IT');
  }

  printJobSheet() {
    if (!this.selectedVehicleForSheet) return;
    const printContent = document.getElementById('printable-job-sheet')?.innerHTML;
    if (printContent) {
      const printWindow = window.open('', '_blank');
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Foglio Lavori - ${this.selectedVehicleForSheet.brand} ${this.selectedVehicleForSheet.model} (${this.selectedVehicleForSheet.plate})</title>
              <style>
                body { font-family: system-ui, -apple-system, sans-serif; padding: 3rem; color: #333; }
                table { width: 100%; border-collapse: collapse; margin-top: 1.5rem; }
                th, td { border: 1px solid #eee; padding: 10px; font-size: 0.85rem; text-align: left; }
                th { background: #f8f9fa; font-weight: bold; }
              </style>
            </head>
            <body onload="window.print(); window.close();">
              ${printContent}
            </body>
          </html>
        `);
        printWindow.document.close();
      }
    }
  }

  async addJobFromSheet() {
    if (!this.selectedVehicleForSheet || !this.sheetInlineMaintenance.description || !this.sheetInlineMaintenance.date) return;
    try {
      const v = this.selectedVehicleForSheet;
      const data: Maintenance = {
        vehicleId: v.id,
        vehiclePlate: `${v.brand} ${v.model} (${v.plate})`,
        description: this.sheetInlineMaintenance.description,
        date: Timestamp.fromDate(new Date(this.sheetInlineMaintenance.date)),
        cost: this.sheetInlineMaintenance.cost || 0,
        km: this.sheetInlineMaintenance.km || null,
        workshop: this.sheetInlineMaintenance.workshop || ''
      };

      await this.rentalService.addMaintenance(data);
      this.sheetInlineMaintenance = { description: '', date: '', cost: null, km: null, workshop: '' };
      
      this.sheetMaintenances = this.allMaintenances.filter(m => m.vehicleId === v.id);
    } catch (error) {
      console.error('Errore durante l\'aggiunta della lavorazione:', error);
      alert('Si è verificato un errore.');
    }
  }

  editingJobId: string | null = null;
  tempEditingJob: any = {};

  startEditJob(job: Maintenance) {
    this.editingJobId = job.id || null;
    this.tempEditingJob = { ...job };
  }

  cancelEditJob() {
    this.editingJobId = null;
    this.tempEditingJob = {};
  }

  async saveEditedJob() {
    if (!this.editingJobId || !this.tempEditingJob.description) return;
    try {
      await this.rentalService.updateMaintenance(this.editingJobId, {
        description: this.tempEditingJob.description,
        km: this.tempEditingJob.km || null,
        cost: this.tempEditingJob.cost || 0,
        workshop: this.tempEditingJob.workshop || ''
      });
      this.cancelEditJob();
    } catch (error) {
      console.error('Errore durante la modifica:', error);
      alert('Si è verificato un errore durante la modifica.');
    }
  }
}
