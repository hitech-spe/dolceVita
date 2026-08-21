import { Injectable } from '@angular/core';
import { jsPDF } from 'jspdf';
import { PDFDocument } from 'pdf-lib';
import { Rental, Vehicle, Customer } from './rental.service';
import { Timestamp } from '@angular/fire/firestore';

export interface ContractDetails {
  contractNumber?: string;
  kmOut?: number;
  kmIncluded?: string; // e.g. "Senza Limiti", "2000 km totali", etc.
  timeOut?: string;    // e.g. "09:30"
  timeIn?: string;     // e.g. "18:30"
  isCompany?: boolean;
  companyName?: string;
  companyVat?: string;
  companyAddress?: string;
  companyPhone?: string;
  companyPec?: string;
  mainDriverId?: string;
  driverBirthPlace?: string;
  driverBirthDate?: string;
  driverLicenseNumber?: string;
  driverLicenseIssueDate?: string;
  driverLicenseExpiry?: string;
  driverLicenseReleasedBy?: string;
  driverLicenseCountry?: string;
  additionalDriver1Id?: string;
  additionalDriver2Id?: string;
  baseRate?: number;
  extraKmPrice?: number; // default 0.24
  deposit?: number;      // default 0
  advance?: number;      // default 0
  fuelLevel?: string;    // default "12/12"
  franchise?: number;    // single customizable franchise
  vehicleFuelType?: string; // e.g. "Diesel", "Benzina", etc.
}

@Injectable({
  providedIn: 'root'
})
export class ContractPdfService {

  constructor() { }

  /**
   * Generates a beautifully styled, high-fidelity rental contract as PDF
   * and merges it with the General Conditions PDF.
   */
  async generateContractAndMerge(
    rental: Rental,
    vehicle: Vehicle,
    customer: Customer,
    details: ContractDetails,
    allCustomers: Customer[]
  ): Promise<Blob> {
    const doc = new jsPDF('p', 'mm', 'a4');
    
    // Set Metadata
    doc.setProperties({
      title: `Contratto Noleggio ${details.contractNumber || 'PROVVISORIO'}`,
      subject: 'La Dolce Vita Rent - Contratto di Noleggio',
      author: 'La Dolce Vita Rent'
    });

    // LOAD LOGO PNG BASE64 DYNAMICALLY TO PRESERVE TRANSPARENCY
    let logoPngBase64: string | null = null;
    try {
      logoPngBase64 = await this.loadImgAsPngBase64('assets/condizioniGenerali/logo.webp');
    } catch (e) {
      console.warn('Could not load logo as PNG base64, falling back to text. Error:', e);
    }

    const totalPages = 1; // Generated pages count
    
    // PAGE 1 OF CONTRACT
    this.drawPageHeader(doc, details.contractNumber || '70459', 1, logoPngBase64);
    this.drawContractMetaRow(doc, rental, vehicle, details);
    
    // Section I: Parti del Contratto
    let y = 35;
    y = this.drawSectionParti(doc, customer, details, allCustomers, y);
    
    // Section II: Veicolo
    y = this.drawSectionVeicolo(doc, vehicle, details, y);
    
    // Section III: Durata & Chilometraggio
    y = this.drawSectionDurata(doc, rental, details, y);
    
    // Section IV: Corrispettivo & Servizi (Page 1 tables)
    y = this.drawSectionCorrispettivo(doc, details, y);
    
    // Section V: Firme per Accettazione
    this.drawSignaturesSection(doc, y);
    
    this.drawPageFooter(doc, 1, totalPages);

    // Get Generated PDF ArrayBuffer
    const generatedPdfBytes = doc.output('arraybuffer');

    // Fetch CONDIZIONI GENERALI PDF
    let mergedPdfBytes: Uint8Array;
    try {
      const response = await fetch('/assets/condizioniGenerali/CONDIZIONI GENERALI.pdf');
      if (!response.ok) {
        throw new Error(`Failed to fetch CONDIZIONI GENERALI.pdf (Status: ${response.status})`);
      }
      const conditionsPdfBytes = await response.arrayBuffer();

      // Merge the generated pages with conditions pages
      mergedPdfBytes = await this.mergePdfs(generatedPdfBytes, conditionsPdfBytes);
    } catch (error) {
      console.warn('Could not append CONDIZIONI GENERALI.pdf. Downloading contract only. Error:', error);
      // Fallback to only downloading the generated pages if conditions file is missing
      mergedPdfBytes = new Uint8Array(generatedPdfBytes);
    }

    return new Blob([mergedPdfBytes as any], { type: 'application/pdf' });
  }

  /**
   * Merges two PDF files using pdf-lib in browser.
   */
  private async mergePdfs(pdf1Bytes: ArrayBuffer, pdf2Bytes: ArrayBuffer): Promise<Uint8Array> {
    const doc1 = await PDFDocument.load(pdf1Bytes);
    const doc2 = await PDFDocument.load(pdf2Bytes);
    const mergedDoc = await PDFDocument.create();

    // Copy pages of generated contract
    const pages1 = await mergedDoc.copyPages(doc1, doc1.getPageIndices());
    pages1.forEach(p => mergedDoc.addPage(p));

    // Copy pages of general conditions
    const pages2 = await mergedDoc.copyPages(doc2, doc2.getPageIndices());
    pages2.forEach(p => mergedDoc.addPage(p));

    return await mergedDoc.save();
  }

  /**
   * Helper to load an image from URL and convert it to transparent PNG base64 using canvas
   */
  private loadImgAsPngBase64(src: string): Promise<string> {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth;
          canvas.height = img.naturalHeight;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const pngData = canvas.toDataURL('image/png');
            resolve(pngData);
          } else {
            reject(new Error('Canvas 2D context not available'));
          }
        } catch (err) {
          reject(err);
        }
      };
      img.onerror = (err) => {
        reject(err);
      };
      img.src = src;
    });
  }

  // --- RENDERING HELPERS ---

  private drawPageHeader(doc: jsPDF, contractNum: string, pageNum: number, logoPngBase64: string | null) {
    // Top border accent line (Rosso Dolce Vita)
    doc.setFillColor('#dc2626');
    doc.rect(10, 8, 190, 1.5, 'F');

    // Official Logo de La Dolce Vita
    if (logoPngBase64) {
      try {
        doc.addImage(logoPngBase64, 'PNG', 12, 10.5, 30, 11);
      } catch (e) {
        console.warn('Could not add image base64. Error:', e);
        this.drawLogoFallbackText(doc);
      }
    } else {
      this.drawLogoFallbackText(doc);
    }

    // Company Header Info - La Dolce Vita S.r.l.
    doc.setTextColor('#0f172a');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('LA DOLCE VITA S.R.L.', 190, 14, { align: 'right' });
    
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor('#475569');
    doc.text('VIA S. ALLENDE 1 - 74017 MOTTOLA (TA) - PUGLIA', 190, 17.5, { align: 'right' });
    doc.text('P.IVA 02933790731', 190, 20.5, { align: 'right' });
    doc.text('Tel. 3938384001 - Cell. 3760057933 - Email: ladolcevitarent@gmail.com', 190, 23.5, { align: 'right' });
  }

  private drawLogoFallbackText(doc: jsPDF) {
    doc.setTextColor('#dc2626');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('LA DOLCE VITA RENT', 12, 18);
  }

  private drawContractMetaRow(doc: jsPDF, rental: Rental, vehicle: Vehicle, details: ContractDetails) {
    const stipulaDateStr = this.formatTimestampDate(rental.createdAt || Timestamp.now());
    const startTime = details.timeOut || '13:01';

    // Highlight Strip
    doc.setFillColor('#f8fafc');
    doc.rect(10, 27, 190, 6.5, 'F');
    doc.setDrawColor('#cbd5e1');
    doc.setLineWidth(0.2);
    doc.rect(10, 27, 190, 6.5, 'S');

    doc.setTextColor('#0f172a');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(`CONTRATTO N. ${details.contractNumber || 'PROVVISORIO'}`, 12, 31.2);
    
    doc.setFont('Helvetica', 'normal');
    doc.text(`Data stipula:`, 62, 31.2);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${stipulaDateStr} ${startTime}`, 78, 31.2);

    doc.setFont('Helvetica', 'normal');
    doc.text(`Veicolo:`, 122, 31.2);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${vehicle.brand} ${vehicle.model}`, 133, 31.2);

    doc.setFont('Helvetica', 'normal');
    doc.text(`Targa:`, 175, 31.2);
    doc.setFont('Helvetica', 'bold');
    doc.text(`${vehicle.plate}`, 184, 31.2);
  }

  private drawSectionParti(
    doc: jsPDF,
    customer: Customer,
    details: ContractDetails,
    allCustomers: Customer[],
    startY: number
  ): number {
    this.drawSectionTitle(doc, 'I. PARTI DEL CONTRATTO E CONDUCENTI', 'LOCATARIO & CONDUCENTI', startY);

    const colWidth = 61.3;
    const colGap = 3;
    const blockH = 43;
    const contentY = startY + 6.5;

    // Resolve Main Driver database entity
    const mainDriverObj = allCustomers.find(c => c.id === details.mainDriverId) || customer;
    const addDriver1 = allCustomers.find(c => c.id === details.additionalDriver1Id);
    const addDriver2 = allCustomers.find(c => c.id === details.additionalDriver2Id);

    // Guarded date parsing utility
    const parseDateToTimestamp = (dateStr?: string): Timestamp | undefined => {
      if (!dateStr) return undefined;
      const parsed = new Date(dateStr);
      if (isNaN(parsed.getTime())) return undefined;
      return Timestamp.fromDate(parsed);
    };

    // Resolve merged fields for Main Driver (preferring details from UI form)
    const isMainDriverOriginal = (!details.mainDriverId || details.mainDriverId === customer.id);
    const driverBirthPlace = details.driverBirthPlace !== undefined ? details.driverBirthPlace : (mainDriverObj?.birthPlace || '');
    
    const driverBirthTS = parseDateToTimestamp(details.driverBirthDate);
    const driverBirthStr = driverBirthTS 
      ? this.formatTimestampDate(driverBirthTS) 
      : (mainDriverObj?.birthDate ? this.formatTimestampDate(mainDriverObj.birthDate) : '');
    const driverBirthAndPlace = driverBirthPlace ? `${driverBirthPlace} (${driverBirthStr})` : driverBirthStr;

    const driverLicenseNum = details.driverLicenseNumber !== undefined ? details.driverLicenseNumber : (mainDriverObj?.licenseNumber || '');
    
    const driverLicenseExpTS = parseDateToTimestamp(details.driverLicenseExpiry);
    const driverLicenseExp = driverLicenseExpTS 
      ? this.formatTimestampDate(driverLicenseExpTS) 
      : (mainDriverObj?.licenseExpiry ? this.formatTimestampDate(mainDriverObj.licenseExpiry) : '');

    const driverLicenseIssueTS = parseDateToTimestamp(details.driverLicenseIssueDate);
    const driverLicenseIssue = driverLicenseIssueTS 
      ? this.formatTimestampDate(driverLicenseIssueTS) 
      : (mainDriverObj?.licenseIssueDate ? this.formatTimestampDate(mainDriverObj.licenseIssueDate) : '');

    const driverLastName = isMainDriverOriginal ? customer.lastName : (mainDriverObj?.lastName || '');
    const driverFirstName = isMainDriverOriginal ? customer.firstName : (mainDriverObj?.firstName || '');
    const driverAddress = isMainDriverOriginal ? (customer.address || '') : (mainDriverObj?.address || '');

    // Box 1: Locatario / Cliente
    this.drawBoxOutline(doc, 10, contentY, colWidth, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#1e293b');
    doc.text('Locatario / Cliente', 12, contentY + 3.5);

    if (details.isCompany) {
      this.drawKeyValueText(doc, 12, contentY + 7.5, 'Tipologia', 'Azienda', 17);
      this.drawKeyValueText(doc, 12, contentY + 13.5, 'Denominazione', details.companyName || '', 17);
      this.drawKeyValueText(doc, 12, contentY + 19.5, 'P.IVA / CF', details.companyVat || '', 17);
      this.drawKeyValueText(doc, 12, contentY + 25.5, 'Indirizzo', details.companyAddress || '', 17, 42);
      this.drawKeyValueText(doc, 12, contentY + 31.5, 'Tel.', details.companyPhone || customer.phone || '', 17);
      this.drawKeyValueText(doc, 12, contentY + 37.5, 'PEC / Cod. Univ.', details.companyPec || '-', 17);
    } else {
      this.drawKeyValueText(doc, 12, contentY + 7.5, 'Tipologia', 'Privato', 17);
      this.drawKeyValueText(doc, 12, contentY + 13.5, 'Cliente', `${customer.firstName} ${customer.lastName}`, 17);
      this.drawKeyValueText(doc, 12, contentY + 19.5, 'Nascita', driverBirthAndPlace, 17);
      this.drawKeyValueText(doc, 12, contentY + 25.5, 'Residenza', customer.address || '', 17, 42);
      this.drawKeyValueText(doc, 12, contentY + 31.5, 'Tel.', customer.phone || '', 17);
      this.drawKeyValueText(doc, 12, contentY + 37.5, 'Patente', `N. ${driverLicenseNum}`, 17);
    }

    // Box 2: Conducente Principale
    this.drawBoxOutline(doc, 10 + colWidth + colGap, contentY, colWidth, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.text('Conducente principale', 12 + colWidth + colGap, contentY + 3.5);

    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 7.5, 'Cognome', driverLastName, 17);
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 13.5, 'Nome', driverFirstName, 17);
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 19.5, 'Nascita', driverBirthAndPlace, 17);
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 25.5, 'Residenza', driverAddress, 17, 42);
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 31.5, 'Patente', `N. ${driverLicenseNum}`, 17);

    const issueAndExp = (driverLicenseIssue || driverLicenseExp) 
      ? `Ril. ${driverLicenseIssue || '-'} - Scad. ${driverLicenseExp || '-'}` 
      : '';
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 37.5, 'Rilascio/Scad.', issueAndExp, 17);

    // Box 3: Ulteriori Conducenti
    this.drawBoxOutline(doc, 10 + (colWidth + colGap) * 2, contentY, colWidth, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.text('Ulteriori conducenti autorizzati', 12 + (colWidth + colGap) * 2, contentY + 3.5);

    if (addDriver1) {
      const d1Birth = addDriver1.birthDate ? this.formatTimestampDate(addDriver1.birthDate) : '';
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor('#dc2626');
      doc.text('1. CONDUCENTE AGGIUNTIVO', 12 + (colWidth + colGap) * 2, contentY + 7.5);
      doc.setFontSize(6);
      doc.setTextColor('#1e293b');
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 11.5, 'Cognome/Nome', `${addDriver1.lastName} ${addDriver1.firstName}`, 18);
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 16.5, 'Nascita', d1Birth, 18);
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 21.5, 'Patente', addDriver1.licenseNumber || '', 18);
    } else {
      doc.setFont('Helvetica', 'normal');
      doc.setFontSize(6.5);
      doc.setTextColor('#64748b');
      doc.text('Nessun conducente aggiuntivo autorizzato.', 12 + (colWidth + colGap) * 2, contentY + 11.5);
    }

    if (addDriver2) {
      const d2Birth = addDriver2.birthDate ? this.formatTimestampDate(addDriver2.birthDate) : '';
      doc.setFont('Helvetica', 'bold');
      doc.setFontSize(6.5);
      doc.setTextColor('#dc2626');
      doc.text('2. CONDUCENTE AGGIUNTIVO', 12 + (colWidth + colGap) * 2, contentY + 28);
      doc.setFontSize(6);
      doc.setTextColor('#1e293b');
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 32, 'Cognome/Nome', `${addDriver2.lastName} ${addDriver2.firstName}`, 18);
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 36, 'Nascita', d2Birth, 18);
      this.drawKeyValueText(doc, 12 + (colWidth + colGap) * 2, contentY + 40, 'Patente', addDriver2.licenseNumber || '', 18);
    }

    return contentY + blockH + colGap;
  }

  private drawSectionVeicolo(doc: jsPDF, vehicle: Vehicle, details: ContractDetails, startY: number): number {
    this.drawSectionTitle(doc, 'II. VEICOLO OGGETTO DEL NOLEGGIO', 'DATI & STATO', startY);

    const blockH = 46;
    const contentY = startY + 6.5;
    const boxW = 93.5;

    // Draw Vehicle Details column
    this.drawBoxOutline(doc, 10, contentY, boxW, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#1e293b');
    doc.text('Dettaglio Mezzo', 12, contentY + 4);

    this.drawKeyValueText(doc, 12, contentY + 8.5, 'Marca / Modello', `${vehicle.brand} ${vehicle.model}`, 23);
    this.drawKeyValueText(doc, 12, contentY + 13.5, 'Targa', vehicle.plate, 23);
    this.drawKeyValueText(doc, 12, contentY + 18.5, 'Alimentazione', details.vehicleFuelType || vehicle.fuelType || 'Diesel', 23);
    this.drawKeyValueText(doc, 12, contentY + 23.5, 'Cambio', 'Manuale', 23);
    this.drawKeyValueText(doc, 12, contentY + 28.5, 'Tacche carburante', details.fuelLevel || '12/12', 23);
    this.drawKeyValueText(doc, 12, contentY + 33.5, 'Km uscita', details.kmOut ? `${details.kmOut} km` : 'Da definire', 23);
    this.drawKeyValueText(doc, 12, contentY + 38.5, 'Km inclusi', details.kmIncluded || 'Senza Limiti', 23);

    // Draw spacious empty damage notes section instead of vector drawing
    const notesBoxX = 10 + boxW + 3;
    this.drawBoxOutline(doc, notesBoxX, contentY, boxW, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('STATO DEL VEICOLO & NOTE DANNI', notesBoxX + 2, contentY + 4);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor('#64748b');
    doc.text('Annotare eventuali danni riscontrati alla consegna del mezzo:', notesBoxX + 2, contentY + 8.5);

    // Draw clean notebook line spacing for writing notes manually
    doc.setDrawColor('#cbd5e1');
    doc.setLineWidth(0.15);
    for (let i = 0; i < 5; i++) {
      const lineY = contentY + 14 + (i * 6);
      doc.line(notesBoxX + 2, lineY, notesBoxX + boxW - 2, lineY);
    }

    doc.text('Livello Carburante riscontrato alla consegna: ' + (details.fuelLevel || '12/12'), notesBoxX + 2, contentY + 43);

    return contentY + blockH + 3;
  }

  private drawSectionDurata(doc: jsPDF, rental: Rental, details: ContractDetails, startY: number): number {
    this.drawSectionTitle(doc, 'III. DURATA & CHILOMETRAGGIO', 'PERIODO & DETTAGLI', startY);

    const colWidth = 93.5;
    const colGap = 3;
    const blockH = 22;
    const contentY = startY + 6.5;

    const stipulaDateStr = this.formatTimestampDate(rental.createdAt || Timestamp.now());
    const startDateStr = this.formatTimestampDate(rental.startDate);
    const endDateStr = this.formatTimestampDate(rental.endDate);
    const startTime = details.timeOut || '13:01';
    const endTime = details.timeIn || '08:30';
    const diffDays = this.calculateDays(rental.startDate, rental.endDate);

    // Box 1: Periodo noleggio
    this.drawBoxOutline(doc, 10, contentY, colWidth, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.text('Periodo di noleggio', 12, contentY + 3.5);
    
    this.drawKeyValueText(doc, 12, contentY + 7.5, 'Durata', `${diffDays} giorni`, 18);
    this.drawKeyValueText(doc, 12, contentY + 12.5, 'Dal', `${startDateStr} ${startTime}`, 18);
    this.drawKeyValueText(doc, 12, contentY + 17.5, 'Al', `${endDateStr} ${endTime}`, 18);

    // Box 2: Chilometraggio
    this.drawBoxOutline(doc, 10 + colWidth + colGap, contentY, colWidth, blockH);
    doc.setFont('Helvetica', 'bold');
    doc.text('Chilometraggio', 12 + colWidth + colGap, contentY + 3.5);
    
    this.drawKeyValueText(doc, 12 + colWidth + colGap, contentY + 7.5, 'Chilometri inclusi', details.kmIncluded || 'Senza Limiti', 30);

    return contentY + blockH + colGap;
  }

  private drawSectionCorrispettivo(doc: jsPDF, details: ContractDetails, startY: number): number {
    this.drawSectionTitle(doc, 'IV. FRANCHIGIA SELEZIONATA', 'RESPONSABILITÀ', startY);

    const contentY = startY + 6.5;
    const boxW = 190;
    const boxH = 26;

    this.drawBoxOutline(doc, 10, contentY, boxW, boxH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor('#1e293b');
    doc.text('LIMITAZIONE DELLA RESPONSABILITÀ', 12, contentY + 4.5);

    const franchiseVal = details.franchise !== undefined ? details.franchise : 0;

    // Selected Franchise text and clause
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7);
    doc.setTextColor('#1e293b');
    doc.text('CONDIZIONE DI RESPONSABILITÀ LIMITATA', 14, contentY + 10);

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.8);
    doc.setTextColor('#475569');
    
    const franchiseText = "In caso di: furto, incendio sinistre contorto e danni al veicolo, il cliente si riterra responsabile fino ad un valore massimale della somma prevista.";
    // Clean text-wrapping for standard PDF document margins
    const splitText = doc.splitTextToSize(franchiseText, 130);
    doc.text(splitText, 14, contentY + 14);

    // High-impact amount box on the right
    doc.setFillColor('#f8fafc');
    doc.rect(150, contentY + 3, 35, 20, 'F');
    doc.setDrawColor('#cbd5e1');
    doc.roundedRect(150, contentY + 3, 35, 20, 1, 1, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor('#64748b');
    doc.text('VALORE FRANCHIGIA', 167.5, contentY + 8, { align: 'center' });

    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(10.5);
    doc.setTextColor('#dc2626');
    doc.text(`${franchiseVal.toFixed(2)} €`, 167.5, contentY + 15, { align: 'center' });

    return contentY + boxH + 3;
  }

  private drawSignaturesSection(doc: jsPDF, startY: number) {
    const boxW = 92;
    const boxH = 34;

    this.drawBoxOutline(doc, 10, startY, boxW, boxH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text('FIRMA CONDUCENTE PRINCIPALE', 12, startY + 4.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor('#64748b');
    doc.text('Firma per accettazione delle Parti del contratto, franchigie', 12, startY + 9);
    doc.text('e termini di addebito penali.', 12, startY + 11.5);
    
    doc.line(15, startY + 28, 85, startY + 28);
    doc.text('Firma Conducente', 50, startY + 31.5, { align: 'center' });

    this.drawBoxOutline(doc, 10 + boxW + 6, startY, boxW, boxH);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.setTextColor('#0f172a');
    doc.text('FIRMA LOCATORE (LA DOLCE VITA S.R.L.)', 12 + boxW + 6, startY + 4.5);
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6);
    doc.setTextColor('#64748b');
    doc.text('Firma dell\'Amministratore pro tempore per consegna del veicolo', 12 + boxW + 6, startY + 9);
    doc.text('e stipula definitiva delle presenti condizioni.', 12 + boxW + 6, startY + 11.5);

    doc.line(15 + boxW + 6, startY + 28, 85 + boxW + 6, startY + 28);
    doc.text('Firma La Dolce Vita S.r.l.', 50 + boxW + 6, startY + 31.5, { align: 'center' });
  }

  private drawPageFooter(doc: jsPDF, pageNum: number, totalPages: number) {
    // Left completely empty to remove bottom footer from contract
  }

  private drawSectionTitle(doc: jsPDF, text: string, rightTag: string, y: number) {
    // Beautiful minimalist title with vertical Rosso Dolce Vita left line
    doc.setFillColor('#f8fafc');
    doc.rect(10, y, 190, 5.2, 'F');
    
    doc.setFillColor('#dc2626'); // Rosso Dolce Vita left block
    doc.rect(10, y, 1.2, 5.2, 'F');
    
    doc.setTextColor('#0f172a');
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(7.5);
    doc.text(text, 13, y + 3.6);

    // Right-aligned clean light-grey category label
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor('#94a3b8');
    doc.text(rightTag, 190, y + 3.5, { align: 'right' });
  }

  private drawBoxOutline(doc: jsPDF, x: number, y: number, w: number, h: number) {
    doc.setDrawColor('#e2e8f0');
    doc.setFillColor('#ffffff');
    doc.setLineWidth(0.2);
    doc.roundedRect(x, y, w, h, 2, 2, 'S');
  }

  private drawCheckbox(doc: jsPDF, x: number, y: number, label: string) {
    doc.setDrawColor('#64748b');
    doc.setLineWidth(0.25);
    doc.rect(x, y, 2.5, 2.5, 'S');
    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(6.5);
    doc.setTextColor('#475569');
    doc.text(label, x + 4, y + 2.1);
  }

  private drawKeyValueText(doc: jsPDF, x: number, y: number, label: string, val: string, offset: number = 22, maxW?: number) {
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(6.5);
    doc.setTextColor('#475569');
    doc.text(`${label}:`, x, y);
    
    doc.setFont('Helvetica', 'normal');
    doc.setTextColor('#0f172a');
    if (maxW) {
      doc.text(val || '-', x + offset, y, { maxWidth: maxW });
    } else {
      doc.text(val || '-', x + offset, y);
    }
  }

  // --- VECTOR CAR DRAWINGS (Clean SVG schemas programmatically drawn) ---

  private drawVectorCarSide(doc: jsPDF, x: number, y: number, w: number, h: number) {
    doc.setDrawColor('#94a3b8');
    doc.setLineWidth(0.2);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor('#64748b');
    doc.text('Fiancata / Frontale', x + w / 2, y + 2, { align: 'center' });

    // Draw programmatic vector car profile
    const cx = x + w / 2;
    const cy = y + h / 2 + 2;

    doc.setDrawColor('#475569');
    // Cabin roof
    doc.line(cx - 10, cy - 6, cx + 5, cy - 6);
    // Windshield
    doc.line(cx - 10, cy - 6, cx - 14, cy);
    // Rear windshield
    doc.line(cx + 5, cy - 6, cx + 11, cy);
    // Hood / front nose
    doc.line(cx - 14, cy, cx - 20, cy);
    doc.line(cx - 20, cy, cx - 20, cy + 4);
    // Trunk
    doc.line(cx + 11, cy, cx + 16, cy);
    doc.line(cx + 16, cy, cx + 16, cy + 4);
    // Underbody chassis line
    doc.line(cx - 20, cy + 4, cx + 16, cy + 4);

    // Wheel arches & Wheels
    doc.circle(cx - 11, cy + 4, 2, 'S');
    doc.circle(cx + 8, cy + 4, 2, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('Vista laterale / frontale check-in', cx, y + h - 1, { align: 'center' });
  }

  private drawVectorCarTop(doc: jsPDF, x: number, y: number, w: number, h: number) {
    doc.setDrawColor('#94a3b8');
    doc.setLineWidth(0.2);
    doc.setFont('Helvetica', 'bold');
    doc.setFontSize(5.5);
    doc.setTextColor('#64748b');
    doc.text('Dall\'alto / Interni', x + w / 2, y + 2, { align: 'center' });

    // Draw programmatic vector car top-down outline
    const cx = x + w / 2;
    const cy = y + h / 2 + 1;

    doc.setDrawColor('#475569');
    // Main body outline
    doc.roundedRect(cx - 8, cy - 14, 16, 26, 3, 3, 'S');
    // Windshield lines top/bottom
    doc.line(cx - 8, cy - 6, cx + 8, cy - 6);
    doc.line(cx - 8, cy + 4, cx + 8, cy + 4);
    
    // Seats outline
    doc.rect(cx - 5, cy - 4, 4, 4, 'S');
    doc.rect(cx + 1, cy - 4, 4, 4, 'S');
    doc.rect(cx - 5, cy + 6, 10, 4, 'S');

    doc.setFont('Helvetica', 'normal');
    doc.setFontSize(4.5);
    doc.text('Vista dall\'alto / interni check-out', cx, y + h - 1, { align: 'center' });
  }

  // --- TIME UTILITIES ---

  private formatTimestampDate(timestamp: any): string {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  }

  private calculateDays(start: any, end: any): number {
    if (!start || !end) return 1;
    const dateStart = start.toDate ? start.toDate() : new Date(start);
    const dateEnd = end.toDate ? end.toDate() : new Date(end);
    const diffMs = Math.abs(dateEnd.getTime() - dateStart.getTime());
    const days = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
    return days || 1;
  }
}