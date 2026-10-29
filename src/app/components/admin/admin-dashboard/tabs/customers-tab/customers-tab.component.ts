import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, tap } from 'rxjs';
import { Customer, CustomerAttachment, RentalService, Vehicle } from '../../../../../services/rental.service';
import { LoadingService } from '../../../../../services/loading.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-customers-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-tab.component.html'
})
export class CustomersTabComponent implements OnInit {
  private rentalService = inject(RentalService);
  private loadingService = inject(LoadingService);

  customers$!: Observable<Customer[]>;
  searchTerm = '';
  sortOrder: 'newest' | 'oldest' | 'alpha' = 'newest';
  currentPage = 1;
  itemsPerPage = 10;

  isModalOpen = false;
  isEditMode = false;
  isSaving = false;
  isRefreshing = false;
  editingCustomerId?: string;
  newCustomer: any = {};
  pendingAttachments: CustomerAttachment[] = [];

  ngOnInit() {
    this.loadingService.show();
    this.customers$ = this.rentalService.getCustomers().pipe(
      tap({
        next: () => this.loadingService.hide(),
        error: (err) => {
          console.error('Error loading customers:', err);
          this.loadingService.hide();
        }
      })
    );
  }

  async refreshCustomers() {
    if (this.isRefreshing) return;
    try {
      this.isRefreshing = true;
      this.loadingService.show();
      await this.rentalService.refreshCustomers();
    } catch (e) {
      console.error('Errore durante l\'aggiornamento manuale dei clienti:', e);
    } finally {
      this.isRefreshing = false;
      this.loadingService.hide();
    }
  }

  openModal(customer?: Customer) {
    if (customer) {
      this.isEditMode = true;
      this.editingCustomerId = customer.id;
      this.newCustomer = { 
        ...customer,
        birthDate: this.formatDateForInput(customer.birthDate),
        licenseExpiry: this.formatDateForInput(customer.licenseExpiry),
        licenseIssueDate: this.formatDateForInput(customer.licenseIssueDate)
      };
      this.pendingAttachments = [...(customer.attachments || [])];
    } else {
      this.isEditMode = false;
      this.editingCustomerId = undefined;
      this.newCustomer = {};
      this.pendingAttachments = [];
    }
    this.isModalOpen = true;
  }

  formatDateForInput(val: any): string {
    if (!val) return '';
    try {
      if (typeof val === 'string') {
        const trimmed = val.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) return trimmed;
        if (trimmed.includes('/')) {
          const parts = trimmed.split('/');
          if (parts.length === 3) {
            return `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
          }
        }
      }
      let d: Date;
      if (typeof val?.toDate === 'function') {
        d = val.toDate();
      } else if (val instanceof Date) {
        d = val;
      } else if (typeof val?.seconds === 'number') {
        d = new Date(val.seconds * 1000);
      } else if (typeof val?._seconds === 'number') {
        d = new Date(val._seconds * 1000);
      } else {
        d = new Date(val);
      }
      if (isNaN(d.getTime())) return '';
      const yyyy = d.getFullYear();
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const dd = String(d.getDate()).padStart(2, '0');
      return `${yyyy}-${mm}-${dd}`;
    } catch (e) {
      console.warn('Errore parsing data per input:', e);
    }
    return '';
  }

  closeModal() {
    this.isModalOpen = false;
    this.newCustomer = {};
    this.pendingAttachments = [];
    this.isSaving = false;
  }

  async saveCustomer() {
    if (this.isSaving) return;
    const firstName = (this.newCustomer.firstName || '').trim();
    const lastName = (this.newCustomer.lastName || '').trim();
    if (!firstName || !lastName) {
      alert('Inserisci Nome e Cognome per il cliente.');
      return;
    }

    try {
      this.isSaving = true;
      this.loadingService.show();
      const data: Customer = {
        ...this.newCustomer,
        firstName: firstName,
        lastName: lastName,
        phone: (this.newCustomer.phone || '').trim(),
        address: (this.newCustomer.address || '').trim(),
        licenseNumber: (this.newCustomer.licenseNumber || '').trim(),
        birthPlace: (this.newCustomer.birthPlace || '').trim(),
        licenseReleasedBy: (this.newCustomer.licenseReleasedBy || '').trim(),
        birthDate: this.parseToTimestamp(this.newCustomer.birthDate),
        licenseExpiry: this.parseToTimestamp(this.newCustomer.licenseExpiry),
        licenseIssueDate: this.parseToTimestamp(this.newCustomer.licenseIssueDate),
        attachments: this.pendingAttachments
      };

      if (this.isEditMode && this.editingCustomerId) {
        await this.rentalService.updateCustomer(this.editingCustomerId, data);
      } else {
        await this.rentalService.addCustomer(data);
      }

      this.currentPage = 1;
      this.searchTerm = '';
      this.sortOrder = 'newest';
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio del cliente:', error);
      alert('Si è verificato un errore durante il salvataggio del cliente.');
    } finally {
      this.isSaving = false;
      this.loadingService.hide();
    }
  }

  private parseToTimestamp(val: any): Timestamp | null {
    if (!val) return null;
    if (val instanceof Timestamp) return val;
    if (typeof val?.toDate === 'function') return Timestamp.fromDate(val.toDate());
    if (val instanceof Date && !isNaN(val.getTime())) return Timestamp.fromDate(val);
    if (typeof val?.seconds === 'number') return Timestamp.fromMillis(val.seconds * 1000);
    if (typeof val?._seconds === 'number') return Timestamp.fromMillis(val._seconds * 1000);
    if (typeof val === 'string' && val.trim()) {
      const trimmed = val.trim();
      if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
        const [y, m, d] = trimmed.split('-').map(Number);
        return Timestamp.fromDate(new Date(y, m - 1, d, 12, 0, 0));
      }
      const d = new Date(trimmed);
      if (!isNaN(d.getTime())) return Timestamp.fromDate(d);
    }
    return null;
  }

  async onNewFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;

    try {
      this.loadingService.show();
      const uploaded = await this.rentalService.uploadCustomerDocument(this.editingCustomerId || 'pending', file);
      this.pendingAttachments = [...this.pendingAttachments, uploaded];
      this.loadingService.hide();
    } catch (error) {
      this.loadingService.hide();
      console.error('Errore durante il caricamento del file su Firebase Storage:', error);
      alert('Si è verificato un errore durante il caricamento del documento su Firebase Storage.');
    } finally {
      event.target.value = '';
    }
  }

  async removePendingAttachment(index: number) {
    const att = this.pendingAttachments[index];
    if (att && att.path) {
      this.rentalService.deleteCustomerDocument(att.path);
    }
    this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
  }

  async onFileSelected(event: any, customer: Customer) {
    const file = event.target.files[0];
    if (!file || !customer.id) return;

    try {
      this.loadingService.show();
      const uploaded = await this.rentalService.uploadCustomerDocument(customer.id, file);
      const updatedAttachments = [...(customer.attachments || []), uploaded];
      await this.rentalService.updateCustomer(customer.id, { attachments: updatedAttachments });
      this.loadingService.hide();
    } catch (error) {
      this.loadingService.hide();
      console.error("Errore durante il caricamento dell'allegato su Firebase Storage:", error);
      alert("Si è verificato un errore durante il caricamento del documento su Firebase Storage.");
    } finally {
      event.target.value = '';
    }
  }

  async removeAttachment(customer: Customer, index: number) {
    if (!customer.id || !customer.attachments) return;
    try {
      this.loadingService.show();
      const att = customer.attachments[index];
      if (att && att.path) {
        await this.rentalService.deleteCustomerDocument(att.path);
      }
      const updatedAttachments = customer.attachments.filter((_, i) => i !== index);
      await this.rentalService.updateCustomer(customer.id, { attachments: updatedAttachments });
      this.loadingService.hide();
    } catch (error) {
      this.loadingService.hide();
      console.error("Errore durante la rimozione dell'allegato:", error);
      alert("Si è verificato un errore durante la rimozione dell'allegato.");
    }
  }

  downloadAttachment(attachment: CustomerAttachment) {
    if (attachment.url) {
      window.open(attachment.url, '_blank');
      return;
    }
    if (attachment.data) {
      const link = document.createElement('a');
      link.href = attachment.data;
      link.download = attachment.name;
      link.click();
    }
  }

  async deleteCustomer(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
      try {
        this.loadingService.show();
        await this.rentalService.deleteCustomer(id);
        this.loadingService.hide();
      } catch (error) {
        this.loadingService.hide();
        console.error('Errore durante l\'eliminazione del cliente:', error);
        alert('Si è verificato un errore durante l\'eliminazione del cliente.');
      }
    }
  }

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    try {
      if (typeof timestamp === 'string') {
        const trimmed = timestamp.trim();
        if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
          const [y, m, d] = trimmed.split('-');
          return `${d}/${m}/${y}`;
        }
      }
      if (typeof timestamp?.toDate === 'function') {
        return timestamp.toDate().toLocaleDateString('it-IT');
      }
      if (timestamp instanceof Date) {
        return isNaN(timestamp.getTime()) ? '-' : timestamp.toLocaleDateString('it-IT');
      }
      if (typeof timestamp?.seconds === 'number') {
        return new Date(timestamp.seconds * 1000).toLocaleDateString('it-IT');
      }
      if (typeof timestamp?._seconds === 'number') {
        return new Date(timestamp._seconds * 1000).toLocaleDateString('it-IT');
      }
      const d = new Date(timestamp);
      return isNaN(d.getTime()) ? '-' : d.toLocaleDateString('it-IT');
    } catch {
      return '-';
    }
  }

  private getTimestampSeconds(val: any): number {
    if (!val) return 0;
    if (typeof val?.seconds === 'number') return val.seconds;
    if (typeof val?.toDate === 'function') return Math.floor(val.toDate().getTime() / 1000);
    if (val instanceof Date) return Math.floor(val.getTime() / 1000);
    if (typeof val === 'string') {
      const d = new Date(val);
      if (!isNaN(d.getTime())) return Math.floor(d.getTime() / 1000);
    }
    return 0;
  }

  getFiltered(items: Customer[] | null): Customer[] {
    if (!items) return [];
    let filtered = items
        .filter(i => {
          const first = i.firstName?.toLowerCase() || '';
          const last = i.lastName?.toLowerCase() || '';
          const term = this.searchTerm.toLowerCase();
          return first.includes(term) || last.includes(term);
        });

    return filtered.sort((a, b) => {
      if (this.sortOrder === 'newest') {
        const dateA = this.getTimestampSeconds(a.createdAt);
        const dateB = this.getTimestampSeconds(b.createdAt);
        if (dateA !== dateB) return dateB - dateA;
        return (a.lastName || '').localeCompare(b.lastName || '');
      } else if (this.sortOrder === 'oldest') {
        const dateA = this.getTimestampSeconds(a.createdAt);
        const dateB = this.getTimestampSeconds(b.createdAt);
        if (dateA !== dateB) return dateA - dateB;
        return (a.lastName || '').localeCompare(b.lastName || '');
      } else {
        return (a.lastName || '').localeCompare(b.lastName || '');
      }
    });
  }

  getPaginated(items: Customer[] | null): Customer[] {
    const filtered = this.getFiltered(items);
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    return filtered.slice(startIndex, startIndex + this.itemsPerPage);
  }

  getTotalPages(items: Customer[] | null): number {
    const filtered = this.getFiltered(items);
    return Math.ceil(filtered.length / this.itemsPerPage);
  }
}
