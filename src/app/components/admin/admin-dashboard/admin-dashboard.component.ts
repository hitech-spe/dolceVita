import { Component, OnInit, OnDestroy, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { BehaviorSubject, Subscription } from 'rxjs';
import { FleetTabComponent } from './tabs/fleet-tab/fleet-tab.component';
import { CustomersTabComponent } from './tabs/customers-tab/customers-tab.component';
import { InsuranceTabComponent } from './tabs/insurance-tab/insurance-tab.component';
import { InspectionTabComponent } from './tabs/inspection-tab/inspection-tab.component';
import { MaintenanceTabComponent } from './tabs/maintenance-tab/maintenance-tab.component';
import { RemindersTabComponent } from './tabs/reminders-tab/reminders-tab.component';
import { RentalService, Reminder } from '../../../services/rental.service';

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
export class AdminDashboardComponent implements OnInit, OnDestroy {
  private rentalService = inject(RentalService);

  currentTab: Tab = 'calendar';
  locations = ['Tutte', 'Mottola', 'Massafra', 'Grottaglie'];
  selectedLocation$ = new BehaviorSubject<string>('Tutte');

  // Early alert global notifications
  activeAlertsCount = 0;
  pendingPopupAlerts: Reminder[] = [];
  private shownAlertPopups = new Set<string>();
  private allReminders: Reminder[] = [];
  private remindersSub?: Subscription;
  private timerId?: any;

  ngOnInit() {
    // Subscribe to reminders
    this.remindersSub = this.rentalService.getReminders().subscribe(reminders => {
      this.allReminders = reminders;
      this.recalculateAlerts();
    });

    // Check periodically (every 10 seconds for ultra-immediate detection) because time advances and alerts can become active
    this.timerId = setInterval(() => {
      this.recalculateAlerts();
    }, 10000);
  }

  ngOnDestroy() {
    if (this.remindersSub) {
      this.remindersSub.unsubscribe();
    }
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  recalculateAlerts() {
    let count = 0;
    const now = Date.now();
    const newActiveAlerts: Reminder[] = [];

    for (const rem of this.allReminders) {
      if (rem.completed) continue;
      if (!rem.alertBeforeUnit || rem.alertBeforeUnit === 'none' || !rem.alertBeforeValue) continue;

      let offsetMs = 0;
      const val = rem.alertBeforeValue;
      switch (rem.alertBeforeUnit) {
        case 'minutes':
          offsetMs = val * 60 * 1000;
          break;
        case 'hours':
          offsetMs = val * 60 * 60 * 1000;
          break;
        case 'days':
          offsetMs = val * 24 * 60 * 60 * 1000;
          break;
      }

      const targetTime = rem.date.toDate().getTime();
      const alertTime = targetTime - offsetMs;

      if (now >= alertTime && now < targetTime) {
        count++;
        // If it's active and hasn't been shown as a popup modal in this session, queue it!
        if (rem.id && !this.shownAlertPopups.has(rem.id)) {
          this.shownAlertPopups.add(rem.id);
          this.pendingPopupAlerts.push(rem);
        }
      }
    }

    this.activeAlertsCount = count;
  }

  get currentPopupAlert(): Reminder | null {
    return this.pendingPopupAlerts.length > 0 ? this.pendingPopupAlerts[0] : null;
  }

  async completePopupAlert(reminder: Reminder) {
    if (!reminder.id) return;
    try {
      await this.rentalService.updateReminder(reminder.id, { completed: true });
      this.dismissPopupAlert();
    } catch (error) {
      console.error('Errore nel completamento del promemoria da popup:', error);
    }
  }

  dismissPopupAlert() {
    if (this.pendingPopupAlerts.length > 0) {
      this.pendingPopupAlerts.shift(); // Remove the top of the queue
    }
  }

  formatAlertDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('it-IT', options);
  }

  onTabChange(tab: Tab) {
    this.currentTab = tab;
  }

  changeLocationFilter(loc: string) {
    this.selectedLocation$.next(loc);
  }
}
