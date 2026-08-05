import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, combineLatest, map, switchMap, BehaviorSubject } from 'rxjs';
import { Rental, RentalService, Vehicle, Customer, TemporaryTransfer, MaintenancePeriod } from "../../../../../services/rental.service";
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-calendar-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './calendar-tab.component.html',
  styleUrls: ['./calendar-tab.component.scss']
})
export class CalendarTabComponent implements OnInit {
  @Input() selectedLocation$!: Observable<string>;
  
  private rentalService = inject(RentalService);
  
  vehiclesData$!: Observable<{
    vehicle: Vehicle, 
    rentals: Rental[], 
    transfers: TemporaryTransfer[], 
    maintenances: MaintenancePeriod[],
    displayLocation: string
  }[]>;
  days: Date[] = [];
  
  // Filtri e Ricerca
  searchTerm: string = '';
  sortBy: 'category' | 'brand' | 'plate' = 'category';
  
  // Navigazione Calendario
  startDate: Date = new Date();
  
  // Modali e stati
  selectedRental: Rental | null = null;
  isRentalModalOpen = false;
  isMaintenanceModalOpen = false;
  isTransferModalOpen = false;
  isConfirmationModalOpen = false;
  isSaleModalOpen = false;
  selectedStatusForAction: any = null;
  selectedDayForAction: Date | null = null;
  manualEndDate: string = '';
  isEditMode = false;
  editingRentalId?: string;

  // Form data
  newRental: any = { location: 'Mottola', returnLocation: 'Mottola', status: 'Prenotato', isServiceRental: false };
  newMaintenance: any = { vehicleId: '', startDate: '', endDate: '', notes: '' };
  newTransfer: any = { vehicleId: '', startDate: '', endDate: '', location: 'Mottola', notes: '' };
  newSale: any = { vehicleId: '', soldDate: '' };

  availableVehicles: Vehicle[] = [];
  availableCustomers: Customer[] = [];

  readonly CATEGORY_ORDER = [
    'A', 'B', 'C', 'D', 'E', 'F', '7 posti', 'Van 9 posti', 
    'L1H1', 'L2H1', 'L2H2', 'L3H3', 'L4H3', 'Cassa quadrata',
    'Cassone aperto 3 posti', 'Cassone aperto 7 posti', 
    'Sponda idraulica', 'Refrigerato', 'Ribaltabile'
  ];

  private searchSubject = new BehaviorSubject<string>('');
  private sortSubject = new BehaviorSubject<'category' | 'brand' | 'plate'>('category');
  private dateSubject = new BehaviorSubject<Date>(new Date());

  ngOnInit() {
    this.startDate = new Date();
    this.startDate.setDate(this.startDate.getDate() - 3);
    this.dateSubject.next(this.startDate);

    this.dateSubject.subscribe(date => {
      this.generateDays(date);
    });
    
    this.rentalService.getVehicles().subscribe(v => this.availableVehicles = v);
    this.rentalService.getCustomers().subscribe(c => this.availableCustomers = c);

    this.vehiclesData$ = combineLatest([
      this.selectedLocation$,
      this.searchSubject,
      this.sortSubject
    ]).pipe(
      switchMap(([loc, search, sort]) => {
        const filterLoc = loc === 'Tutte' ? undefined : loc;
        return combineLatest([
          this.rentalService.getVehicles(filterLoc),
          this.rentalService.getRentals(filterLoc),
          this.rentalService.getTemporaryTransfers(),
          this.rentalService.getMaintenancePeriods()
        ]).pipe(
          map(([vehicles, rentals, transfers, maintenances]) => {
            // Filtraggio
            let filteredVehicles = vehicles.filter(v => {
              const s = search.toLowerCase();
              return v.brand.toLowerCase().includes(s) || 
                     v.model.toLowerCase().includes(s) || 
                     v.plate.toLowerCase().includes(s) ||
                     v.category.toLowerCase().includes(s);
            });

            // Ordinamento
            filteredVehicles.sort((a, b) => {
              if (sort === 'category') {
                const indexA = this.CATEGORY_ORDER.indexOf(a.category);
                const indexB = this.CATEGORY_ORDER.indexOf(b.category);
                if (indexA === -1 && indexB === -1) return a.category.localeCompare(b.category);
                if (indexA === -1) return 1;
                if (indexB === -1) return -1;
                return indexA - indexB;
              } else if (sort === 'brand') {
                return a.brand.localeCompare(b.brand);
              } else {
                return a.plate.localeCompare(b.plate);
              }
            });

            return filteredVehicles.map(v => {
              const vehicleRentals = rentals.filter(r => r.vehicleId === v.id);
              const vehicleTransfers = transfers.filter(t => t.vehicleId === v.id);
              const vehicleMaintenances = maintenances.filter(m => m.vehicleId === v.id);

              return {
                vehicle: v,
                rentals: vehicleRentals,
                transfers: vehicleTransfers,
                maintenances: vehicleMaintenances,
                displayLocation: v.location
              };
            });
          })
        );
      })
    );
  }

  // --- LOGICA FILTRI E NAVIGAZIONE ---

  onSearchChange() {
    this.searchSubject.next(this.searchTerm);
  }

  onSortChange() {
    this.sortSubject.next(this.sortBy);
  }

  prevPeriod() {
    const newDate = new Date(this.startDate);
    newDate.setDate(newDate.getDate() - 7);
    this.startDate = newDate;
    this.dateSubject.next(this.startDate);
  }

  nextPeriod() {
    const newDate = new Date(this.startDate);
    newDate.setDate(newDate.getDate() + 7);
    this.startDate = newDate;
    this.dateSubject.next(this.startDate);
  }

  goToToday() {
    const today = new Date();
    today.setDate(today.getDate() - 3);
    this.startDate = today;
    this.dateSubject.next(this.startDate);
  }

  // --- LOGICA CALENDARIO ---

  getTodayClass(day: Date): string {
    const today = new Date();
    if (day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()) {
      return 'is-today';
    }
    return '';
  }

  private generateDays(baseDate: Date) {
    this.days = [];
    for (let i = 0; i < 35; i++) {
      const d = new Date(baseDate);
      d.setDate(baseDate.getDate() + i);
      this.days.push(d);
    }
  }

  getDayStatus(item: any, day: Date): { type: 'rental' | 'transfer' | 'maintenance' | 'sold' | null, data?: any } {
    const d = new Date(day);
    d.setHours(0,0,0,0);
    const time = d.getTime();

    if (item.vehicle.status === 'Venduto' && item.vehicle.soldDate) {
      const soldDate = item.vehicle.soldDate.toDate();
      soldDate.setHours(0,0,0,0);
      if (time >= soldDate.getTime()) {
        return { type: 'sold', data: item.vehicle };
      }
    }

    const trans = item.transfers.find((t: any) => {
      const s = t.startDate.toDate(); s.setHours(0,0,0,0);
      const e = t.endDate.toDate(); e.setHours(0,0,0,0);
      return time >= s.getTime() && time <= e.getTime();
    });
    if (trans) return { type: 'transfer', data: trans };

    const rental = item.rentals.find((r: any) => {
      if (r.status === 'Cancellato') return false;
      const s = r.startDate.toDate(); s.setHours(0,0,0,0);
      const e = r.endDate.toDate(); e.setHours(0,0,0,0);
      return time >= s.getTime() && time <= e.getTime();
    });
    if (rental) return { type: 'rental', data: rental };

    const maint = item.maintenances.find((m: any) => {
      const s = m.startDate.toDate(); s.setHours(0,0,0,0);
      const e = m.endDate.toDate(); e.setHours(0,0,0,0);
      return time >= s.getTime() && time <= e.getTime();
    });
    if (maint) return { type: 'maintenance', data: maint };

    return { type: null };
  }

  getVehicleLocationAtDate(item: any, day: Date): string | null {
    const d = new Date(day);
    d.setHours(0,0,0,0);
    const time = d.getTime();

    const trans = item.transfers.find((t: any) => {
      const s = t.startDate.toDate(); s.setHours(0,0,0,0);
      const e = t.endDate.toDate(); e.setHours(0,0,0,0);
      return time >= s.getTime() && time <= e.getTime();
    });

    if (trans) return trans.location;
    return null;
  }
  
  getVehicleLocationClass(item: any, day?: Date): string {
    const location = day ? this.getVehicleLocationAtDate(item, day) : null;
    return location ? this.getLocationClass(location) : this.getLocationClass(item.vehicle.location);
  }

  getCurrentVehicleLocationClass(item: any): string {
    const now = new Date();
    const currentLoc = this.getVehicleLocationAtDate(item, now);
    return this.getLocationClass(currentLoc || item.vehicle.location);
  }
  
  getLocationClass(location: string): string {
    switch(location) {
      case 'Massafra': return 'loc-massafra';
      case 'Mottola': return 'loc-mottola';
      case 'Grottaglie': return 'loc-grottaglie';
      default: return '';
    }
  }

  getRentalBarClass(rental: any, day: Date): string {
    const d = new Date(day);
    d.setHours(0,0,0,0);
    const time = d.getTime();

    const start = rental.startDate.toDate(); start.setHours(0,0,0,0);
    const end = rental.endDate.toDate(); end.setHours(0,0,0,0);

    const isStart = time === start.getTime();
    const isEnd = time === end.getTime();

    if (isStart && isEnd) {
      return 'rental-same-day';
    }
    if (isStart) {
      return 'rental-start-day';
    }
    if (isEnd) {
      return 'rental-end-day';
    }
    if (rental.isServiceRental) {
      return 'service-rental-purple';
    }
    return this.getLocationClass(rental.location);
  }

  getRentalDayLabel(rental: any, day: Date): string {
    const d = new Date(day);
    d.setHours(0,0,0,0);
    const time = d.getTime();

    const start = rental.startDate.toDate(); start.setHours(0,0,0,0);
    const end = rental.endDate.toDate(); end.setHours(0,0,0,0);

    const isStart = time === start.getTime();
    const isEnd = time === end.getTime();

    const formatPeriod = (period: string) => {
      if (period === 'Tarda mat') return 'T.mat';
      return period;
    };

    const startP = formatPeriod(rental.startPeriod || 'Mat');
    const endP = formatPeriod(rental.endPeriod || 'Mat');

    if (isStart && isEnd) {
      if (startP === endP) return startP;
      return `${startP}-${endP}`;
    }
    if (isStart) {
      return startP;
    }
    if (isEnd) {
      return endP;
    }
    return '';
  }

  // --- AZIONI MODALI ---

  openRentalModal(rental?: Rental) {
    if (rental) {
      this.isEditMode = true;
      this.editingRentalId = rental.id;
      const startDate = rental.startDate && (rental.startDate as any).toDate ? (rental.startDate as any).toDate().toISOString().split('T')[0] : '';
      const endDate = rental.endDate && (rental.endDate as any).toDate ? (rental.endDate as any).toDate().toISOString().split('T')[0] : '';
      this.newRental = { 
        ...rental, 
        startDate, 
        endDate, 
        isServiceRental: !!rental.isServiceRental,
        startPeriod: rental.startPeriod || 'Mat',
        endPeriod: rental.endPeriod || 'Mat'
      };
    } else {
      this.isEditMode = false;
      this.editingRentalId = undefined;
      this.newRental = { 
        location: 'Mottola', 
        returnLocation: 'Mottola', 
        status: 'Prenotato', 
        isServiceRental: false,
        startPeriod: 'Mat',
        endPeriod: 'Mat'
      };
    }
    this.isRentalModalOpen = true;
  }

  openMaintenanceModal(vehicleId?: string) {
    this.newMaintenance = { vehicleId: vehicleId || '', startDate: '', endDate: '', notes: '' };
    this.isMaintenanceModalOpen = true;
  }

  openTransferModal(vehicleId?: string) {
    this.newTransfer = { vehicleId: vehicleId || '', startDate: '', endDate: '', location: 'Mottola', notes: '' };
    this.isTransferModalOpen = true;
  }

  openSaleModal() {
    this.newSale = { vehicleId: '', soldDate: new Date().toISOString().split('T')[0] };
    this.isSaleModalOpen = true;
  }

  closeModals() {
    this.isRentalModalOpen = false;
    this.isMaintenanceModalOpen = false;
    this.isTransferModalOpen = false;
    this.isConfirmationModalOpen = false;
    this.isSaleModalOpen = false;
    this.selectedRental = null;
    this.selectedStatusForAction = null;
    this.selectedDayForAction = null;
  }

  // --- SALVATAGGIO DATI ---

  async saveRental() {
    if (!this.newRental.vehicleId || !this.newRental.customerId || !this.newRental.startDate) return;
    try {
      const selectedCar = this.availableVehicles.find(v => v.id === this.newRental.vehicleId);
      const selectedCustomer = this.availableCustomers.find(c => c.id === this.newRental.customerId);

      const rentalToSave: Rental = {
        ...this.newRental,
        isServiceRental: !!this.newRental.isServiceRental,
        startPeriod: this.newRental.startPeriod || 'Mat',
        endPeriod: this.newRental.endPeriod || 'Mat',
        customerName: selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName}` : (this.newRental.customerName || 'Cliente non trovato'),
        vehiclePlate: selectedCar ? `${selectedCar.brand} ${selectedCar.model} (${selectedCar.plate})` : (this.newRental.vehiclePlate || 'Veicolo non trovato'),
        startDate: Timestamp.fromDate(new Date(this.newRental.startDate)),
        endDate: this.newRental.endDate ? Timestamp.fromDate(new Date(this.newRental.endDate)) : Timestamp.now()
      };

      rentalToSave.status = this.rentalService.calculateStatus(rentalToSave);

      if (this.isEditMode && this.editingRentalId) {
        await this.rentalService.updateRental(this.editingRentalId, rentalToSave);
      } else {
        await this.rentalService.createRental(rentalToSave);
      }
      this.closeModals();
    } catch (error) {
      console.error('Errore noleggio:', error);
    }
  }

  async saveSale() {
    if (!this.newSale.vehicleId || !this.newSale.soldDate) return;
    try {
      const soldDateTimestamp = Timestamp.fromDate(new Date(this.newSale.soldDate));
      await this.rentalService.updateVehicle(this.newSale.vehicleId, {
        status: 'Venduto',
        soldDate: soldDateTimestamp
      });
      this.closeModals();
    } catch (error) {
      console.error('Errore registrazione vendita:', error);
      alert('Si è verificato un errore durante la registrazione della vendita.');
    }
  }

  async cancelSale() {
    if (!this.selectedStatusForAction || this.selectedStatusForAction.type !== 'sold') return;
    const vehicle = this.selectedStatusForAction.data;
    
    if (confirm(`Sei sicuro di voler annullare la vendita del veicolo ${vehicle.brand} ${vehicle.model} (${vehicle.plate})?`)) {
      try {
        await this.rentalService.updateVehicle(vehicle.id, {
          status: 'Attivo',
          soldDate: null as any
        });
        this.closeModals();
      } catch (error) {
        console.error('Errore annullamento vendita:', error);
        alert('Si è verificato un errore durante l\'annullamento della vendita.');
      }
    }
  }

  async saveMaintenance() {
    if (!this.newMaintenance.vehicleId || !this.newMaintenance.startDate || !this.newMaintenance.endDate) return;
    try {
      await this.rentalService.addMaintenancePeriod({
        vehicleId: this.newMaintenance.vehicleId,
        startDate: Timestamp.fromDate(new Date(this.newMaintenance.startDate)),
        endDate: Timestamp.fromDate(new Date(this.newMaintenance.endDate)),
        notes: this.newMaintenance.notes
      });
      this.closeModals();
    } catch (error) {
      console.error('Errore manutenzione:', error);
    }
  }

  async saveTransfer() {
    if (!this.newTransfer.vehicleId || !this.newTransfer.startDate || !this.newTransfer.endDate) return;
    try {
      await this.rentalService.addTemporaryTransfer({
        vehicleId: this.newTransfer.vehicleId,
        startDate: Timestamp.fromDate(new Date(this.newTransfer.startDate)),
        endDate: Timestamp.fromDate(new Date(this.newTransfer.endDate)),
        location: this.newTransfer.location,
        notes: this.newTransfer.notes
      });
      this.closeModals();
    } catch (error) {
      console.error('Errore trasferimento:', error);
    }
  }

  getFormattedTooltip(type: string, data: any): string {
    if (type === 'sold') {
      const dateStr = data.soldDate ? (data.soldDate as any).toDate().toLocaleDateString('it-IT') : '-';
      return `Veicolo Venduto il ${dateStr}\n\nClicca su un giorno per annullare la vendita`;
    }
    if (type === 'rental') {
      const start = data.startDate.toDate().toLocaleDateString('it-IT');
      const end = data.endDate.toDate().toLocaleDateString('it-IT');
      const typeLabel = data.isServiceRental ? 'Noleggio per Servizi' : 'Noleggio Standard';
      return `${typeLabel}: ${data.customerName}\nDal ${start} al ${end}\nSede: ${data.location} -> ${data.returnLocation || data.location}\n\nClicca su un giorno per terminare o allungare il noleggio`;
    }
    if (type === 'maintenance') {
      return `In Manutenzione\nNote: ${data.notes || '-'}\n\nClicca su un giorno per terminare o allungare la manutenzione`;
    }
    if (type === 'transfer') {
      return `Trasferimento Temporaneo: ${data.location}\nNote: ${data.notes || '-'}\n\nClicca su un giorno per terminare o allungare il trasferimento`;
    }
    return '';
  }

  async onCellClick(item: any, day: Date, status: any) {
    if (!status || !status.type) return;

    this.selectedStatusForAction = status;
    this.selectedDayForAction = day;
    // Pre-popola la data manuale con quella cliccata (ma l'utente può cambiarla)
    this.manualEndDate = day.toISOString().split('T')[0];
    this.isConfirmationModalOpen = true;
  }

  async confirmTermination() {
    if (!this.selectedStatusForAction || !this.manualEndDate) return;
    
    const status = this.selectedStatusForAction;
    const finalDate = new Date(this.manualEndDate);

    try {
      const newEndDate = Timestamp.fromDate(finalDate);
      if (status.type === 'rental') {
        await this.rentalService.updateRental(status.data.id, { endDate: newEndDate });
      } else if (status.type === 'maintenance') {
        await this.rentalService.updateMaintenancePeriod(status.data.id, { endDate: newEndDate });
      } else if (status.type === 'transfer') {
        await this.rentalService.updateTemporaryTransfer(status.data.id, { endDate: newEndDate });
      }
      this.closeModals();
    } catch (error) {
      console.error('Errore durante l\'aggiornamento dello stato:', error);
      alert('Si è verificato un errore durante l\'operazione.');
    }
  }

  async deleteStatus() {
    if (!this.selectedStatusForAction) return;
    
    const status = this.selectedStatusForAction;
    const confirmMsg = `Sei sicuro di voler eliminare definitivamente questo ${status.type === 'rental' ? 'noleggio' : (status.type === 'maintenance' ? 'periodo di manutenzione' : 'trasferimento')}?`;
    
    if (confirm(confirmMsg)) {
      try {
        if (status.type === 'rental') {
          await this.rentalService.deleteRental(status.data.id);
        } else if (status.type === 'maintenance') {
          await this.rentalService.deleteMaintenancePeriod(status.data.id);
        } else if (status.type === 'transfer') {
          await this.rentalService.deleteTemporaryTransfer(status.data.id);
        }
        this.closeModals();
      } catch (error) {
        console.error('Errore durante l\'eliminazione dello stato:', error);
        alert('Si è verificato un errore durante l\'eliminazione.');
      }
    }
  }
}
