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
      
      this.newCustomer = { 
        ...customer,
        birthDate: birthDate,
        licenseExpiry: licenseExpiry
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
        birthDate: Timestamp.fromDate(new Date(this.newCustomer.birthDate)),
        licenseExpiry: Timestamp.fromDate(new Date(this.newCustomer.licenseExpiry)),
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
    return items
        .filter(i =>
            i.firstName.toLowerCase().includes(this.searchTerm.toLowerCase()) ||
            i.lastName.toLowerCase().includes(this.searchTerm.toLowerCase())
        )
  }
}
