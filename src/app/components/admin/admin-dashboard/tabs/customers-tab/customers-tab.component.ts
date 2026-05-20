import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable } from 'rxjs';
import { Customer, RentalService } from '../../../../../services/rental.service';

@Component({
  selector: 'app-customers-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './customers-tab.component.html'
})
export class CustomersTabComponent implements OnInit {
  private rentalService = inject(RentalService);

  customers$!: Observable<Customer[]>;

  isModalOpen = false;
  newCustomer: any = {};

  ngOnInit() {
    this.customers$ = this.rentalService.getCustomers();
  }

  openModal() { this.isModalOpen = true; }
  closeModal() { this.isModalOpen = false; this.newCustomer = {}; }

  async saveCustomer() {
    if (!this.newCustomer.firstName || !this.newCustomer.lastName) return;
    const data: Customer = {
      ...this.newCustomer,
      birthDate: new Date(this.newCustomer.birthDate) as any,
      licenseExpiry: new Date(this.newCustomer.licenseExpiry) as any
    };
    await this.rentalService.addCustomer(data);
    this.closeModal();
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

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    if (timestamp.toDate) return timestamp.toDate().toLocaleDateString('it-IT');
    return new Date(timestamp).toLocaleDateString('it-IT');
  }
}
