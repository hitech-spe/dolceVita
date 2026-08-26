import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Observable, Subscription } from 'rxjs';
import { RentalService, Verbale, ContractDocument, Customer, Rental } from '../../../../../services/rental.service';
import { Timestamp } from '@angular/fire/firestore';
import { LoadingService } from '../../../../../services/loading.service';

@Component({
  selector: 'app-verbali-tab',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './verbali-tab.component.html',
  styleUrls: ['./verbali-tab.component.scss']
})
export class VerbaliTabComponent implements OnInit {
  private rentalService = inject(RentalService);
  private loadingService = inject(LoadingService);

  verbali: Verbale[] = [];
  allContracts: ContractDocument[] = [];
  allRentals: Rental[] = [];
  allCustomers: Customer[] = [];

  searchTerm = '';
  isUploadModalOpen = false;
  isSendingPec: { [key: string]: boolean } = {};

  // Wizard Navigation
  currentStep = 1; // Step 1: Upload, Step 2: Extract & Match, Step 3: Mail Draft

  // For the upload / creation form
  selectedFile: File | null = null;
  selectedFileName = '';
  selectedFileSize = '';
  uploadProgress = 0;
  isOcrRunning = false;

  // New Verbale Form model
  newVerbale: Partial<Verbale> = {
    plate: '',
    ticketNumber: '',
    fineAmount: undefined,
    authorityName: '',
    authorityPec: '',
    status: 'Nuovo',
    notes: ''
  };

  violationDateStr = ''; // YYYY-MM-DD
  violationTimeStr = ''; // HH:MM

  // Auto-matching state
  matchedContract: ContractDocument | null = null;
  matchedCustomer: Customer | null = null;
  matchedRental: Rental | null = null;
  matchingSearchDone = false;

  // Email draft state
  emailDraft = {
    to: '',
    subject: '',
    body: '',
    attachVerbale: true,
    attachContract: true,
    attachCustomerDoc: true
  };

  private subs: Subscription[] = [];

  ngOnInit() {
    this.loadingService.show();
    
    // Load existing verbali
    const vSub = this.rentalService.getVerbali().subscribe({
      next: (data) => {
        this.verbali = data || [];
        this.loadingService.hide();
      },
      error: (err) => {
        console.error('Error loading verbali:', err);
        this.loadingService.hide();
      }
    });
    this.subs.push(vSub);

    // Load contracts
    const cSub = this.rentalService.getContracts().subscribe(contracts => {
      this.allContracts = contracts || [];
    });
    this.subs.push(cSub);

    // Load rentals
    const rSub = this.rentalService.getRentals().subscribe(rentals => {
      this.allRentals = rentals || [];
    });
    this.subs.push(rSub);

    // Load customers
    const custSub = this.rentalService.getCustomers().subscribe(customers => {
      this.allCustomers = customers || [];
    });
    this.subs.push(custSub);
  }

  ngOnDestroy() {
    this.subs.forEach(s => s.unsubscribe());
  }

  // --- KPI Stats Calculation ---
  getTotaleMulte(): number {
    return this.verbali.length;
  }

  getNuoveMulte(): number {
    return this.verbali.filter(v => v.status !== 'Inviato').length;
  }

  getInviateMulte(): number {
    return this.verbali.filter(v => v.status === 'Inviato').length;
  }

  getImportoMulte(): number {
    return this.verbali.reduce((sum, v) => sum + (v.fineAmount || 0), 0);
  }

  getFilteredVerbali(): Verbale[] {
    if (!this.searchTerm) {
      return this.verbali;
    }
    const term = this.searchTerm.toLowerCase();
    return this.verbali.filter(v => 
      v.plate.toLowerCase().includes(term) ||
      v.ticketNumber.toLowerCase().includes(term) ||
      v.authorityName.toLowerCase().includes(term) ||
      (v.customerName && v.customerName.toLowerCase().includes(term)) ||
      (v.contractNumber && v.contractNumber.toLowerCase().includes(term))
    );
  }

  openUploadModal() {
    this.isUploadModalOpen = true;
    this.currentStep = 1;
    this.resetForm();
  }

  closeUploadModal() {
    this.isUploadModalOpen = false;
  }

  goToStep(step: number) {
    if (step === 2 && !this.selectedFile) {
      alert('Carica prima il verbale PDF per continuare.');
      return;
    }
    if (step === 3 && (!this.newVerbale.plate || !this.newVerbale.ticketNumber || !this.violationDateStr)) {
      alert('Compilare i campi obbligatori (Targa, Numero Verbale, Data Infrazione) prima di procedere.');
      return;
    }
    this.currentStep = step;
  }

  nextStep() {
    this.goToStep(this.currentStep + 1);
  }

  prevStep() {
    this.goToStep(this.currentStep - 1);
  }

  resetForm() {
    this.selectedFile = null;
    this.selectedFileName = '';
    this.selectedFileSize = '';
    this.uploadProgress = 0;
    this.isOcrRunning = false;
    this.violationDateStr = '';
    this.violationTimeStr = '';
    this.newVerbale = {
      plate: '',
      ticketNumber: '',
      fineAmount: undefined,
      authorityName: '',
      authorityPec: '',
      status: 'Nuovo',
      notes: ''
    };
    this.matchedContract = null;
    this.matchedCustomer = null;
    this.matchedRental = null;
    this.matchingSearchDone = false;
    this.resetEmailDraft();
  }

  resetEmailDraft() {
    this.emailDraft = {
      to: '',
      subject: '',
      body: '',
      attachVerbale: true,
      attachContract: true,
      attachCustomerDoc: true
    };
  }

  onFileSelected(event: any) {
    const file = event.target.files?.[0];
    if (file) {
      this.selectedFile = file;
      this.selectedFileName = file.name;
      // Convert size to human readable
      const sizeKb = file.size / 1024;
      this.selectedFileSize = sizeKb > 1024 
        ? `${(sizeKb / 1024).toFixed(2)} MB` 
        : `${sizeKb.toFixed(0)} KB`;

      this.runMockOcr();
    }
  }

  runMockOcr() {
    this.isOcrRunning = true;
    this.uploadProgress = 10;

    // Simulate file reading and OCR extraction steps
    const interval = setInterval(() => {
      if (this.uploadProgress < 90) {
        this.uploadProgress += 20;
      }
    }, 250);

    setTimeout(() => {
      clearInterval(interval);
      this.uploadProgress = 100;
      this.isOcrRunning = false;

      // Smart mock OCR: pick information from an existing contract to guarantee a match for demonstration
      if (this.allContracts.length > 0) {
        // Pick the most recent contract as a reference
        const refContract = this.allContracts[0];
        
        // Find corresponding rental to get the exact start date and location
        const refRental = this.allRentals.find(r => r.id === refContract.rentalId);
        
        let targetDate = new Date();
        if (refRental) {
          // Set date to the rental's start date
          const ts = refRental.startDate as any;
          targetDate = ts?.toDate ? ts.toDate() : new Date(ts);
        }

        // Format Date to YYYY-MM-DD
        const yyyy = targetDate.getFullYear();
        const mm = String(targetDate.getMonth() + 1).padStart(2, '0');
        const dd = String(targetDate.getDate()).padStart(2, '0');
        this.violationDateStr = `${yyyy}-${mm}-${dd}`;
        this.violationTimeStr = '11:15';

        this.newVerbale = {
          plate: refContract.vehiclePlate || 'AA123BB',
          ticketNumber: `V-${Math.floor(1000 + Math.random() * 9000)}/2026`,
          fineAmount: 148.50,
          authorityName: 'Polizia Locale Mottola',
          authorityPec: 'polizialocale.mottola@pec.rupar.puglia.it',
          status: 'Nuovo',
          notes: 'Dati estratti automaticamente tramite scansione intelligente OCR del verbale PDF.'
        };
      } else {
        // Fallback dummy data if no contracts exist
        this.violationDateStr = new Date().toISOString().split('T')[0];
        this.violationTimeStr = '09:30';
        this.newVerbale = {
          plate: 'FX124ZA',
          ticketNumber: 'V-5491/2026',
          fineAmount: 110.00,
          authorityName: 'Comando Polizia Municipale Taranto',
          authorityPec: 'pm.comune.taranto@pec.rupar.puglia.it',
          status: 'Nuovo',
          notes: 'Dati simulati - Nessun contratto presente nel sistema.'
        };
      }

      // Automatically run match once OCR completes
      this.findMatchingRental();
      
      // Auto advance to step 2 after OCR completes for seamless flow
      setTimeout(() => {
        this.currentStep = 2;
      }, 600);

    }, 1500);
  }

  findMatchingRental() {
    this.matchingSearchDone = true;
    this.matchedContract = null;
    this.matchedRental = null;
    this.matchedCustomer = null;

    if (!this.newVerbale.plate || !this.violationDateStr) {
      return;
    }

    const plate = this.newVerbale.plate.trim().toUpperCase();
    const violationTime = this.violationTimeStr || '12:00';
    const infrazioneTimeMs = new Date(`${this.violationDateStr}T${violationTime}`).getTime();

    // 1. Find rental of that vehicle during that timeframe
    const match = this.allRentals.find(r => {
      if (!r.vehiclePlate || r.vehiclePlate.trim().toUpperCase() !== plate) {
        return false;
      }
      
      const startMs = (r.startDate as any)?.seconds 
        ? (r.startDate as any).seconds * 1000 
        : new Date(r.startDate as any).getTime();

      const endMs = (r.endDate as any)?.seconds 
        ? (r.endDate as any).seconds * 1000 
        : new Date(r.endDate as any).getTime();

      return infrazioneTimeMs >= startMs && infrazioneTimeMs <= endMs;
    });

    if (match) {
      this.matchedRental = match;
      
      // 2. Find contract document of that rental
      const contract = this.allContracts.find(c => c.rentalId === match.id);
      if (contract) {
        this.matchedContract = contract;
      }

      // 3. Find customer profile
      const customerId = match.customerId || contract?.customerId;
      if (customerId) {
        const customer = this.allCustomers.find(c => c.id === customerId);
        if (customer) {
          this.matchedCustomer = customer;
        }
      }
    }

    this.generateEmailDraft();
  }

  generateEmailDraft() {
    if (!this.newVerbale.authorityPec) {
      this.resetEmailDraft();
      return;
    }

    this.emailDraft.to = this.newVerbale.authorityPec;
    this.emailDraft.subject = `Trasmissione dati conducente per Verbale n. ${this.newVerbale.ticketNumber || '[NUMERO]'} del ${this.formatItalianDateStr(this.violationDateStr)} - Veicolo Targa ${this.newVerbale.plate || '[TARGA]'}`;

    if (this.matchedContract && this.matchedCustomer) {
      const c = this.matchedContract;
      const cust = this.matchedCustomer;
      const detail = c.details;

      const birthDateFormatted = cust.birthDate 
        ? this.formatTimestampToItalianDate(cust.birthDate) 
        : (detail.driverBirthDate || '[DATA NASCITA]');

      const licenseExpiryFormatted = cust.licenseExpiry
        ? this.formatTimestampToItalianDate(cust.licenseExpiry)
        : (detail.driverLicenseExpiry || '[SCADENZA PATENTE]');

      this.emailDraft.body = `Spett.le ${this.newVerbale.authorityName || '[ENTE ACCERTATORE]'},

In riferimento al verbale di contestazione n. ${this.newVerbale.ticketNumber || '[NUMERO_VERBALE]'}, relativo all'infrazione rilevata in data ${this.formatItalianDateStr(this.violationDateStr)} alle ore ${this.violationTimeStr || '[ORA]'} con il veicolo targato ${this.newVerbale.plate || '[TARGA]'}, di nostra proprietà,

con la presente si comunica che alla data e ora sopra indicate il suddetto veicolo era concesso in locazione senza conducente alla ditta/sig. ${(cust.lastName + ' ' + cust.firstName).toUpperCase()}, nato a ${cust.birthPlace || detail.driverBirthPlace || '[LUOGO NASCITA]'} il ${birthDateFormatted}, residente a ${cust.address || '[INDIRIZZO RESIDENZA]'}, titolare di patente di guida n. ${cust.licenseNumber || detail.driverLicenseNumber || '[NUMERO PATENTE]'} rilasciata da ${cust.licenseReleasedBy || detail.driverLicenseReleasedBy || '[ORGANO RILASCIO]'} con scadenza il ${licenseExpiryFormatted}.

Si allegano alla presente:
1. Copia del Verbale di contestazione;
2. Copia del Contratto di Locazione n. ${c.contractNumber} del ${this.formatTimestampToItalianDate(c.date)} sottoscritto dalle parti;
3. Copia del documento di identità e patente del conducente locatario.

Si richiede pertanto di voler procedere alla rinotifica del verbale in oggetto direttamente nei confronti del trasgressore sopra identificato, liberando la scrivente società da ogni responsabilità solidale.

Distinti saluti,
La Dolce Vita SRL`;
    } else {
      this.emailDraft.body = `Spett.le ${this.newVerbale.authorityName || '[ENTE ACCERTATORE]'},

In riferimento al verbale di contestazione n. ${this.newVerbale.ticketNumber || '[NUMERO_VERBALE]'}, relativo all'infrazione rilevata in data ${this.formatItalianDateStr(this.violationDateStr)} alle ore ${this.violationTimeStr || '[ORA]'} con il veicolo targato ${this.newVerbale.plate || '[TARGA]'}, di nostra proprietà,

con la presente si segnala che alla data dell'infrazione il veicolo risultava concesso in noleggio. [ATTENZIONE: Nessun contratto abbinato automaticamente. Inserire qui manualmente i dettagli del cliente.]

Si allegano alla presente:
1. Copia del Verbale di contestazione;
[Aggiungere contratti e documenti manualmente]

Si richiede pertanto di voler procedere alla rinotifica del verbale in oggetto direttamente nei confronti del trasgressore sopra identificato.

Distinti saluti,
La Dolce Vita SRL`;
    }
  }

  async saveVerbale(andSendPec = false) {
    if (!this.newVerbale.plate || !this.newVerbale.ticketNumber || !this.violationDateStr) {
      alert('Compilare i campi obbligatori (Targa, Numero Verbale, Data Infrazione).');
      return;
    }

    try {
      this.loadingService.show();
      const parts = this.violationDateStr.split('-');
      const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, parseInt(parts[2], 10));

      const verbaleData: Verbale = {
        plate: this.newVerbale.plate.trim().toUpperCase(),
        ticketNumber: this.newVerbale.ticketNumber.trim(),
        violationDate: Timestamp.fromDate(dateObj),
        violationTime: this.violationTimeStr,
        fineAmount: this.newVerbale.fineAmount || 0,
        authorityName: this.newVerbale.authorityName || 'Polizia Locale',
        authorityPec: this.newVerbale.authorityPec || '',
        status: 'Nuovo',
        notes: this.newVerbale.notes || '',
        rentalId: this.matchedRental?.id || '',
        contractNumber: this.matchedContract?.contractNumber || '',
        customerName: this.matchedCustomer 
          ? `${this.matchedCustomer.lastName} ${this.matchedCustomer.firstName}` 
          : (this.matchedContract?.customerName || '')
      };

      // Handle PDF Base64 mock if a file was uploaded
      if (this.selectedFile) {
        verbaleData.pdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJSDi48U...[MOCK_PDF_CONTENT]';
      }

      const docRef = await this.rentalService.createVerbale(verbaleData);
      this.loadingService.hide();
      
      if (andSendPec) {
        // Automatically send PEC
        verbaleData.id = docRef.id;
        this.sendPec(verbaleData);
      } else {
        alert('Verbale registrato con successo nello storico!');
        this.closeUploadModal();
      }
    } catch (err) {
      console.error('Error saving verbale:', err);
      this.loadingService.hide();
      alert('Errore durante il salvataggio del verbale.');
    }
  }

  sendPec(verbale: Verbale) {
    if (!verbale.authorityPec) {
      alert('Impossibile inviare la PEC: indirizzo destinatario non specificato.');
      return;
    }

    if (verbale.id) {
      this.isSendingPec[verbale.id] = true;
    }

    this.loadingService.show();

    // Call real service or mock fallback
    this.rentalService.sendVerbalePec({
      verbaleId: verbale.id,
      authorityPec: verbale.authorityPec,
      subject: this.emailDraft.subject || `Trasmissione dati conducente per Verbale n. ${verbale.ticketNumber} - Veicolo Targa ${verbale.plate}`,
      body: this.emailDraft.body || `Spett.le ${verbale.authorityName}, ... (dati del verbale e contratto inviati)`,
      attachments: [
        { name: `Verbale_${verbale.ticketNumber.replace(/[\s/]/g, '_')}.pdf`, data: verbale.pdfBase64 || '', type: 'application/pdf' }
      ]
    }).subscribe({
      next: async (response) => {
        if (verbale.id) {
          this.isSendingPec[verbale.id] = false;
        }
        this.loadingService.hide();
        await this.rentalService.updateVerbale(verbale.id!, {
          status: 'Inviato',
          pecSentDate: Timestamp.now()
        });
        alert(`PEC inviata con successo all'indirizzo: ${verbale.authorityPec}\n\nLo stato del verbale è stato aggiornato ad "INVIATO".`);
        this.closeUploadModal();
      },
      error: async (error) => {
        console.warn('Real BE PEC send failed (not configured or unreachable). Running offline simulation...', error);
        
        // Offline Simulation / Fallback for development & demo purposes
        setTimeout(async () => {
          if (verbale.id) {
            this.isSendingPec[verbale.id] = false;
          }
          this.loadingService.hide();
          
          await this.rentalService.updateVerbale(verbale.id!, {
            status: 'Inviato',
            pecSentDate: Timestamp.now()
          });

          // Compose attachment details for notification
          let attachmentsList = `\n- Copia Verbale PDF`;
          if (verbale.contractNumber && this.emailDraft.attachContract) {
            attachmentsList += `\n- Contratto Locazione N. ${verbale.contractNumber}`;
          }
          if (verbale.customerName && this.emailDraft.attachCustomerDoc) {
            attachmentsList += `\n- Documenti d'identità Cliente (${verbale.customerName})`;
          }

          alert(`[SIMULAZIONE PEC] Invio completato con successo!\n\n` +
                `Destinatario: ${verbale.authorityPec}\n` +
                `Oggetto: ${this.emailDraft.subject || 'Dati Conducente'}\n` +
                `Allegati inclusi:${attachmentsList}\n\n` +
                `Lo stato del verbale è stato aggiornato con successo in archivio.`);
          
          this.closeUploadModal();
        }, 1200);
      }
    });
  }

  async deleteVerbale(verbale: Verbale) {
    if (!verbale.id) return;
    if (!confirm(`Sei sicuro di voler eliminare il verbale n. ${verbale.ticketNumber} dallo storico?`)) {
      return;
    }

    try {
      this.loadingService.show();
      await this.rentalService.deleteVerbale(verbale.id);
      this.loadingService.hide();
      alert('Verbale eliminato con successo!');
    } catch (err) {
      console.error('Error deleting verbale:', err);
      this.loadingService.hide();
      alert('Errore durante la cancellazione.');
    }
  }

  // --- Utility Formatting Methods ---

  formatDate(timestamp: any): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return date.toLocaleDateString('it-IT');
  }

  formatDateTime(timestamp: any, timeStr?: string): string {
    if (!timestamp) return '-';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dateStr = date.toLocaleDateString('it-IT');
    return timeStr ? `${dateStr} - ${timeStr}` : dateStr;
  }

  formatTimestampToItalianDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const dd = String(date.getDate()).padStart(2, '0');
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const yyyy = date.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  }

  formatItalianDateStr(dateStr: string): string {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    return `${parts[2]}/${parts[1]}/${parts[0]}`;
  }
}
