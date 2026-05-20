import { Component, Input, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, BehaviorSubject, switchMap } from 'rxjs';
import {Insurance, RentalService, Vehicle} from '../../../../../services/rental.service';

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

  vehicles$!: Observable<Vehicle[]>;

  isModalOpen = false;
  newVehicle: Partial<Vehicle> = { location: 'Mottola', status: 'Attivo', category: 'Auto' };

  ngOnInit() {
    this.vehicles$ = this.selectedLocation$.pipe(
      switchMap(loc => this.rentalService.getVehicles(loc === 'Tutte' ? undefined : loc))
    );
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newVehicle = { location: 'Mottola', status: 'Attivo', category: 'Auto' }; }

  async saveVehicle() {
    if (!this.newVehicle.brand || !this.newVehicle.plate) return;
    await this.rentalService.addVehicle(this.newVehicle as Vehicle);
    this.closeModal();
  }

  getFiltered(items: Vehicle[] | null): Vehicle[] {
    if (!items) return [];
    return items
        .filter(i =>
            i.brand.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            i.model.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            i.plate.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
  }
}
