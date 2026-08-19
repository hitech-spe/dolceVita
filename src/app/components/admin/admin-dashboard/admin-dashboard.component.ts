import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject } from 'rxjs';
import { FleetTabComponent } from './tabs/fleet-tab/fleet-tab.component';
import { CustomersTabComponent } from './tabs/customers-tab/customers-tab.component';
import { InsuranceTabComponent } from './tabs/insurance-tab/insurance-tab.component';
import { InspectionTabComponent } from './tabs/inspection-tab/inspection-tab.component';
import { MaintenanceTabComponent } from './tabs/maintenance-tab/maintenance-tab.component';
import { RemindersTabComponent } from './tabs/reminders-tab/reminders-tab.component';

import { CalendarTabComponent } from './tabs/calendar-tab/calendar-tab.component';

type Tab = 'calendar' | 'fleet' | 'insurance' | 'inspection' | 'maintenance' | 'customers' | 'reminders';

@Component({
  selector: 'app-admin-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    CalendarTabComponent,
    FleetTabComponent,
    CustomersTabComponent,
    InsuranceTabComponent,
    InspectionTabComponent,
    MaintenanceTabComponent,
    RemindersTabComponent
  ],
  templateUrl: './admin-dashboard.component.html',
  styleUrls: ['./admin-dashboard.component.scss']
})
export class AdminDashboardComponent {
  currentTab: Tab = 'calendar';
  locations = ['Tutte', 'Mottola', 'Massafra', 'Grottaglie'];
  selectedLocation$ = new BehaviorSubject<string>('Tutte');

  onTabChange(tab: Tab) {
    this.currentTab = tab;
  }

  changeLocationFilter(loc: string) {
    this.selectedLocation$.next(loc);
  }
}
