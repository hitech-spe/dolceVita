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
      // Convertiamo i Timestamp in stringhe YYYY-MM-DD per l'input date
      const birthDate = customer.birthDate && (customer.birthDate as any).toDate ? (customer.birthDate as any).toDate().toISOString().split('T')[0] : '';
      const licenseExpiry = customer.licenseExpiry && (customer.licenseExpiry as any).toDate ? (customer.licenseExpiry as any).toDate().toISOString().split('T')[0] : '';
      const licenseIssueDate = customer.licenseIssueDate && (customer.licenseIssueDate as any).toDate ? (customer.licenseIssueDate as any).toDate().toISOString().split('T')[0] : '';
      
      this.newCustomer = { 
        ...customer,
        birthDate: birthDate,
        licenseExpiry: licenseExpiry,
        licenseIssueDate: licenseIssueDate
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
    if (typeof val === 'string' && val.trim()) {
      const d = new Date(val);
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
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
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
