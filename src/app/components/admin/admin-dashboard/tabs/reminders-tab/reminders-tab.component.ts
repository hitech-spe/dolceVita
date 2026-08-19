import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { RentalService, Reminder } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-reminders-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './reminders-tab.component.html',
  styleUrls: ['./reminders-tab.component.scss']
})
export class RemindersTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  reminders$!: Observable<Reminder[]>;
  filter: 'all' | 'active' | 'completed' = 'all';

  // Form & Modal states
  isModalOpen = false;
  isEditMode = false;
  editingReminderId?: string;

  newReminderText = '';
  newReminderDate = '';
  newReminderColor = '#fef08a'; // Pastel Yellow default

  // Available beautiful pastel colors for post-its
  colorOptions = [
    { name: 'Giallo', hex: '#fef08a', textHex: '#854d0e', borderHex: '#fef08a' },
    { name: 'Verde', hex: '#bbf7d0', textHex: '#166534', borderHex: '#bbf7d0' },
    { name: 'Azzurro', hex: '#bfdbfe', textHex: '#1e40af', borderHex: '#bfdbfe' },
    { name: 'Rosa', hex: '#fbcfe8', textHex: '#9d174d', borderHex: '#fbcfe8' },
    { name: 'Arancione', hex: '#fed7aa', textHex: '#9a3412', borderHex: '#fed7aa' },
    { name: 'Viola', hex: '#e9d5ff', textHex: '#6b21a8', borderHex: '#e9d5ff' }
  ];

  ngOnInit() {
    this.loadReminders();
  }

  loadReminders() {
    this.reminders$ = this.rentalService.getReminders();
  }

  getFilteredReminders(reminders: Reminder[] | null): Reminder[] {
    if (!reminders) return [];
    
    // Ordina per data (cronologica)
    const sorted = [...reminders].sort((a, b) => a.date.seconds - b.date.seconds);

    if (this.filter === 'active') {
      return sorted.filter(r => !r.completed);
    } else if (this.filter === 'completed') {
      return sorted.filter(r => r.completed);
    }
    return sorted;
  }

  openModal(reminder?: Reminder) {
    if (reminder) {
      this.isEditMode = true;
      this.editingReminderId = reminder.id;
      this.newReminderText = reminder.text;
      this.newReminderColor = reminder.color || '#fef08a';
      
      // Convert Timestamp to YYYY-MM-DDTHH:MM for input type="datetime-local"
      if (reminder.date) {
        const d = reminder.date.toDate();
        // Adjust for timezone to avoid off-by-one errors
        const tzOffset = d.getTimezoneOffset() * 60000;
        const localISOTime = (new Date(d.getTime() - tzOffset)).toISOString().slice(0, 16);
        this.newReminderDate = localISOTime;
      } else {
        this.newReminderDate = '';
      }
    } else {
      this.isEditMode = false;
      this.editingReminderId = undefined;
      this.newReminderText = '';
      this.newReminderColor = '#fef08a';
      // Default to current date and time + 1 hour, rounded to nearest 5 mins
      const now = new Date();
      now.setHours(now.getHours() + 1);
      const tzOffset = now.getTimezoneOffset() * 60000;
      this.newReminderDate = (new Date(now.getTime() - tzOffset)).toISOString().slice(0, 16);
    }
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
    this.newReminderText = '';
    this.newReminderDate = '';
    this.newReminderColor = '#fef08a';
    this.editingReminderId = undefined;
  }

  async saveReminder() {
    if (!this.newReminderText.trim() || !this.newReminderDate) {
      alert('Inserisci sia il testo che la data/ora del promemoria.');
      return;
    }

    try {
      const targetDate = new Date(this.newReminderDate);
      const data: Reminder = {
        text: this.newReminderText.trim(),
        date: Timestamp.fromDate(targetDate),
        color: this.newReminderColor,
        completed: this.isEditMode ? false : false // New or edited defaults/resets to not completed
      };

      if (this.isEditMode && this.editingReminderId) {
        await this.rentalService.updateReminder(this.editingReminderId, data);
      } else {
        await this.rentalService.addReminder(data);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore nel salvataggio del promemoria:', error);
      alert('Si è verificato un errore durante il salvataggio.');
    }
  }

  async toggleComplete(reminder: Reminder, event: Event) {
    event.stopPropagation(); // Avoid triggering any other click
    if (!reminder.id) return;
    try {
      await this.rentalService.updateReminder(reminder.id, {
        completed: !reminder.completed
      });
    } catch (error) {
      console.error('Errore nell\'aggiornamento del promemoria:', error);
    }
  }

  async deleteReminder(id: string, event: Event) {
    event.stopPropagation();
    if (!confirm('Sei sicuro di voler eliminare questo promemoria?')) return;
    try {
      await this.rentalService.deleteReminder(id);
    } catch (error) {
      console.error('Errore nell\'eliminazione del promemoria:', error);
    }
  }

  // Gives a nice organic feel by rotation of post-its
  getTilt(index: number): string {
    const tilts = [-2, 1.5, -1, 2, -1.5, 1];
    const deg = tilts[index % tilts.length];
    return `rotate(${deg}deg)`;
  }

  isPast(timestamp: Timestamp): boolean {
    if (!timestamp) return false;
    return timestamp.toDate().getTime() < Date.now();
  }

  formatDate(timestamp: Timestamp): string {
    if (!timestamp) return '';
    const date = timestamp.toDate();
    const options: Intl.DateTimeFormatOptions = {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    };
    return date.toLocaleDateString('it-IT', options);
  }

  getRelativeTime(timestamp: Timestamp, completed?: boolean): string {
    if (!timestamp || completed) return '';
    
    const diffMs = timestamp.toDate().getTime() - Date.now();
    const isOverdue = diffMs < 0;
    const absDiffMs = Math.abs(diffMs);
    
    const diffMinutes = Math.floor(absDiffMs / (1000 * 60));
    const diffHours = Math.floor(absDiffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(absDiffMs / (1000 * 60 * 60 * 24));

    if (isOverdue) {
      if (diffMinutes < 60) return `Scaduto da ${diffMinutes} min`;
      if (diffHours < 24) return `Scaduto da ${diffHours} ore`;
      return `Scaduto da ${diffDays} giorni`;
    } else {
      if (diffMinutes < 60) return `Scade tra ${diffMinutes} min`;
      if (diffHours < 24) return `Scade tra ${diffHours} ore`;
      return `Scade tra ${diffDays} giorni`;
    }
  }

  getColorStyle(colorHex: string) {
    const option = this.colorOptions.find(o => o.hex === colorHex) || this.colorOptions[0];
    return {
      'background-color': option.hex,
      'color': option.textHex,
      'border-color': option.borderHex
    };
  }
}