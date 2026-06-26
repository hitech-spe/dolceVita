import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Observable, combineLatest, map, switchMap } from 'rxjs';
import {Rental, RentalService, Vehicle} from "../../../../../services/rental.service";
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-calendar-tab',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './calendar-tab.component.html',
  styleUrls: ['./calendar-tab.component.scss']
})
export class CalendarTabComponent implements OnInit {
  @Input() selectedLocation$!: Observable<string>;
  
  private rentalService = inject(RentalService);
  
  vehiclesWithRentals$!: Observable<{vehicle: Vehicle, rentals: Rental[]}[]>;
  days: Date[] = [];
  
  selectedRental: Rental | null = null;
  isModalOpen = false;
  
  ngOnInit() {
    this.generateDays();
    
    this.vehiclesWithRentals$ = this.selectedLocation$.pipe(
      switchMap(loc => {
        const filterLoc = loc === 'Tutte' ? undefined : loc;
        return combineLatest([
          this.rentalService.getVehicles(filterLoc),
          this.rentalService.getRentals(filterLoc)
        ]).pipe(
          map(([vehicles, rentals]) => {
            return vehicles.map(v => ({
              vehicle: v,
              rentals: rentals.filter(r => r.vehicleId === v.id)
            }));
          })
        );
      })
    );
  }

  getTodayClass(day: Date): string {
    const today = new Date();
    if (day.getDate() === today.getDate() &&
        day.getMonth() === today.getMonth() &&
        day.getFullYear() === today.getFullYear()) {
      return 'is-today';
    }
    return '';
  }

  private generateDays() {
    const start = new Date();
    start.setDate(start.getDate() - 3); // Mostra da 3 giorni fa
    for (let i = 0; i < 35; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      this.days.push(d);
    }
  }

  isRented(rentals: Rental[], day: Date): Rental | undefined {
    return rentals.find(r => {
      if (r.status === 'Cancellato') return false;
      const start = r.startDate.toDate();
      const end = r.endDate.toDate();
      
      const d = new Date(day);
      d.setHours(0,0,0,0);
      const s = new Date(start);
      s.setHours(0,0,0,0);
      const e = new Date(end);
      e.setHours(0,0,0,0);
      
      return d >= s && d <= e;
    });
  }
  
  getStatusClass(status: string): string {
    switch(status) {
      case 'Prenotato': return 'status-booked';
      case 'In Corso': return 'status-active';
      case 'Concluso': return 'status-done';
      default: return '';
    }
  }

  openRentalDetail(rental: Rental) {
    this.selectedRental = rental;
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.selectedRental = null;
  }

  getFormattedTooltip(rental: Rental): string {
    const start = rental.startDate instanceof Timestamp ? rental.startDate.toDate() : new Date(rental.startDate);
    const end = rental.endDate instanceof Timestamp ? rental.endDate.toDate() : new Date(rental.endDate);
    
    const dateRange = `${start.toLocaleDateString('it-IT')} - ${end.toLocaleDateString('it-IT')}`;
    let tooltip = `Cliente: ${rental.customerName}\nPeriodo: ${dateRange}`;
    
    if (rental.customerPhone) {
      tooltip += `\nTel: ${rental.customerPhone}`;
    }
    
    if (rental.notes) {
      tooltip += `\nNote: ${rental.notes}`;
    }
    
    return tooltip;
  }
}
