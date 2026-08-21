import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import {Customer, RentalService, Vehicle} from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';

@Component({
  selector: 'app-customers-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-tab.component.html'
})
export class CustomersTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  customers$!: Observable<Customer[]>;
  searchTerm = '';
  sortOrder: 'newest' | 'oldest' | 'alpha' = 'newest';

  isModalOpen = false;
  isEditMode = false;
  editingCustomerId?: string;
  newCustomer: any = {};
  pendingAttachments: { name: string; data: string }[] = [];

  ngOnInit() {
    this.customers$ = this.rentalService.getCustomers();
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

  closeModal() { this.isModalOpen = false; this.newCustomer = {}; this.pendingAttachments = []; }

  async saveCustomer() {
    if (!this.newCustomer.firstName || !this.newCustomer.lastName) return;
    try {
      const data: Customer = {
        ...this.newCustomer,
        birthDate: this.newCustomer.birthDate ? Timestamp.fromDate(new Date(this.newCustomer.birthDate)) : null,
        licenseExpiry: this.newCustomer.licenseExpiry ? Timestamp.fromDate(new Date(this.newCustomer.licenseExpiry)) : null,
        licenseIssueDate: this.newCustomer.licenseIssueDate ? Timestamp.fromDate(new Date(this.newCustomer.licenseIssueDate)) : null,
        attachments: this.pendingAttachments
      };

      if (this.isEditMode && this.editingCustomerId) {
        await this.rentalService.updateCustomer(this.editingCustomerId, data);
      } else {
        await this.rentalService.addCustomer(data);
      }
      this.closeModal();
    } catch (error) {
      console.error('Errore durante il salvataggio del cliente:', error);
      alert('Si è verificato un errore durante il salvataggio del cliente.');
    }
  }

  onNewFileSelected(event: any) {
    const file = event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      this.pendingAttachments = [...this.pendingAttachments, { name: file.name, data: reader.result as string }];
    };
    event.target.value = '';
  }

  removePendingAttachment(index: number) {
    this.pendingAttachments = this.pendingAttachments.filter((_, i) => i !== index);
  }

  async onFileSelected(event: any, customer: Customer) {
    const file = event.target.files[0];
    if (!file || !customer.id) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64String = reader.result as string;
      const updatedAttachments = [...(customer.attachments || []), { name: file.name, data: base64String }];
      await this.rentalService.updateCustomer(customer.id!, { attachments: updatedAttachments });
    };
  }

  async removeAttachment(customer: Customer, index: number) {
    if (!customer.id || !customer.attachments) return;
    const updatedAttachments = customer.attachments.filter((_, i) => i !== index);
    await this.rentalService.updateCustomer(customer.id, { attachments: updatedAttachments });
  }

  downloadAttachment(attachment: { name: string; data: string }) {
    const link = document.createElement('a');
    link.href = attachment.data;
    link.download = attachment.name;
    link.click();
  }

  async deleteCustomer(id: string) {
    if (confirm('Sei sicuro di voler eliminare questo cliente?')) {
      try {
        await this.rentalService.deleteCustomer(id);
      } catch (error) {
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
        const dateA = (a.createdAt as any)?.seconds || 0;
        const dateB = (b.createdAt as any)?.seconds || 0;
        return dateB - dateA;
      } else if (this.sortOrder === 'oldest') {
        const dateA = (a.createdAt as any)?.seconds || 0;
        const dateB = (b.createdAt as any)?.seconds || 0;
        return dateA - dateB;
      } else {
        return a.lastName.localeCompare(b.lastName);
      }
    });
  }
}
