import { Injectable, inject, Injector, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  setDoc,
  query,
  where,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  getDocs,
  writeBatch,
  limit
} from '@angular/fire/firestore';
import { Observable, map, shareReplay, combineLatest } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';

// --- INTERFACCE ---
export interface Vehicle {
  id?: string;
  brand: string;
  model: string;
  plate: string;
  location: 'Mottola' | 'Massafra' | 'Grottaglie';
  category: string; // es. 'Segmento A', 'Furgoni', ecc.
  status: 'Attivo' | 'Manutenzione' | 'Venduto';
  dailyPrice?: number;
  fuelType?: string; // es. 'Diesel', 'Benzina', 'Ibrido', 'Elettrico', ecc.
  soldDate?: Timestamp;
  createdAt?: Timestamp;
}

export interface Rental {
  id?: string;
  vehicleId: string;      // Riferimento all'auto
  vehiclePlate?: string;  // Utile da salvare per ricerche veloci
  customerId?: string;    // Riferimento al cliente
  customerName: string;
  customerPhone?: string;
  startDate: Timestamp;   // Usiamo sempre Timestamp di Firebase
  endDate: Timestamp;
  location: 'Mottola' | 'Massafra' | 'Grottaglie';
  returnLocation?: 'Mottola' | 'Massafra' | 'Grottaglie'; // Sede di rientro
  status: 'Prenotato' | 'In Corso' | 'Concluso' | 'Cancellato';
  totalPrice?: number;
  isServiceRental?: boolean;
  startPeriod?: 'Mat' | 'Tarda mat' | 'Pom' | 'Sera';
  endPeriod?: 'Mat' | 'Tarda mat' | 'Pom' | 'Sera';
  notes?: string;
  createdAt?: Timestamp;
}

export interface TemporaryTransfer {
  id?: string;
  vehicleId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  location: 'Mottola' | 'Massafra' | 'Grottaglie';
  notes?: string;
  createdAt?: Timestamp;
}

export interface MaintenancePeriod {
  id?: string;
  vehicleId: string;
  startDate: Timestamp;
  endDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
}

export interface Insurance {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  company: string;
  policyNumber: string;
  expiryDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
}

export interface Inspection {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  expiryDate: Timestamp;
  notes?: string;
  createdAt?: Timestamp;
}

export interface Maintenance {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  description: string;
  date: Timestamp;
  cost?: number;
  km?: number;
  workshop?: string;
  createdAt?: Timestamp;
  maintenancePeriodId?: string;
}

export interface Customer {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate?: Timestamp;
  birthPlace?: string;
  licenseNumber?: string;
  licenseIssueDate?: Timestamp;
  licenseExpiry?: Timestamp;
  licenseReleasedBy?: string;
  licenseCountry?: string;
  phone?: string;
  address?: string;
  attachments?: { name: string, data: string }[]; // Base64 attachments
  createdAt?: Timestamp;
}

export interface Reminder {
  id?: string;
  text: string;
  date: Timestamp;
  completed?: boolean;
  color?: string; // Hex or CSS color string for the post-it background
  alertBeforeValue?: number; // offset value
  alertBeforeUnit?: 'minutes' | 'hours' | 'days' | 'none'; // offset unit
  repeat?: 'none' | 'hourly' | 'every_2_hours' | 'every_4_hours' | 'every_8_hours' | 'every_12_hours' | 'daily' | 'weekly' | 'monthly' | 'yearly';
  createdAt?: Timestamp;
}

export interface ContractDetails {
  contractNumber?: string;
  kmOut?: number;
  kmIncluded?: string; // e.g. "Senza Limiti", "2000 km totali", etc.
  timeOut?: string;    // e.g. "09:30"
  timeIn?: string;     // e.g. "18:30"
  depositAmount?: number; // Deposito Cauzionale (€)
  depositType?: string;   // Tipologia Deposito (es. Carta, Contanti, ecc.)
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
  additionalDriver1Address?: string;
  additionalDriver1Phone?: string;
  additionalDriver2Id?: string;
  additionalDriver2Address?: string;
  additionalDriver2Phone?: string;
  baseRate?: number;
  extraKmPrice?: number; // default 0.24
  deposit?: number;      // default 0
  advance?: number;      // default 0
  fuelLevel?: string;    // default "12/12"
  franchise?: number;    // single customizable franchise
  vehicleFuelType?: string; // e.g. "Diesel", "Benzina", etc.
}

export interface ContractDocument {
  id?: string;
  contractNumber: string;
  rentalId: string;
  customerId: string;
  customerName: string;
  vehicleId: string;
  vehiclePlate: string;
  date: Timestamp;
  details: ContractDetails; // Serialized ContractDetails
  createdAt?: Timestamp;
  cargos_status?: 'SENT' | 'FAILED' | string;
  cargos_transaction_id?: string;
  cargos_sync_time?: Timestamp;
  cargos_error?: string | null;
  pdfBase64?: string | null;

  // Flat root fields for Cargos integration
  contratto_data?: string;
  contratto_checkout_data?: string;
  contratto_checkin_data?: string;
  conducente_contraente_nascita_luogo?: string;
  conducente_contraente_nascita_data?: string;
  conducente_contraente_patente_numero?: string;
  conducente_contraente_patente_luogoril?: string;
  conducente_contraente_patente_luogoril_paese?: string;
  conducente_contraente_docide_numero?: string;
  conducente_contraente_docide_luogoril?: string;
  conducente_contraente_docide_luogoril_paese?: string;
}

export interface Company {
  id?: string;
  name: string;
  vat: string;
  address?: string;
  phone?: string;
  pec?: string;
  createdAt?: Timestamp;
}

export interface Verbale {
  id?: string;
  plate: string;
  violationDate: Timestamp;
  violationTime?: string;
  ticketNumber: string;
  fineAmount?: number;
  authorityName: string;
  authorityPec: string;
  status: 'Nuovo' | 'In Corso' | 'Inviato' | 'Errore';
  rentalId?: string;
  contractNumber?: string;
  customerName?: string;
  pecSentDate?: Timestamp;
  pdfBase64?: string | null;
  notes?: string;
  createdAt?: Timestamp;
  matchFound?: boolean;
  matchType?: string;
}

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private injector = inject(Injector);

  // --- IN-MEMORY FIRESTORE STREAM CACHES ---
  private vehicles$?: Observable<Vehicle[]>;
  private rentals$?: Observable<Rental[]>;
  private customers$?: Observable<Customer[]>;
  private companies$?: Observable<Company[]>;
  private insurances$?: Observable<Insurance[]>;
  private inspections$?: Observable<Inspection[]>;
  private reminders$?: Observable<Reminder[]>;
  private maintenances$?: Observable<Maintenance[]>;
  private maintenancePeriods$?: Observable<MaintenancePeriod[]>;
  private temporaryTransfers$?: Observable<TemporaryTransfer[]>;
  private contracts$?: Observable<ContractDocument[]>;
  private verbali$?: Observable<Verbale[]>;

  // ==========================================
  // GESTIONE VEICOLI (IL PARCO MEZZI)
  // ==========================================

  /** Recupera tutti i veicoli (con filtro opzionale per sede) */
  getVehicles(location?: string): Observable<Vehicle[]> {
    if (!this.vehicles$) {
      const vehiclesRef = collection(this.firestore, 'vehicles');
      this.vehicles$ = (collectionData(vehiclesRef, { idField: 'id' }) as Observable<Vehicle[]>).pipe(
        map(vehicles => {
          // Ordina per data di inserimento decrescente (più recenti in alto)
          vehicles.sort((a, b) => {
            const dateA = (a.createdAt as any)?.seconds || 0;
            const dateB = (b.createdAt as any)?.seconds || 0;
            if (dateA !== dateB) return dateB - dateA;
            return a.brand.localeCompare(b.brand);
          });
          return vehicles;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    if (location) {
      return this.vehicles$.pipe(
        map(vehicles => vehicles.filter(v => v.location === location))
      );
    }
    return this.vehicles$;
  }

  /** Aggiunge una nuova auto */
  async addVehicle(vehicle: Vehicle) {
    const vehiclesRef = collection(this.firestore, 'vehicles');
    return addDoc(vehiclesRef, { ...vehicle, createdAt: Timestamp.now() });
  }

  /** Modifica un'auto (es. cambio stato in Manutenzione) */
  async updateVehicle(id: string, data: Partial<Vehicle>) {
    const docRef = doc(this.firestore, `vehicles/${id}`);
    return updateDoc(docRef, data);
  }

  /** Aggiunge un veicolo con dettagli opzionali (assicurazione, revisione, manutenzione) in un batch */
  async addVehicleWithDetails(vehicle: Vehicle, insurance?: Partial<Insurance>, inspection?: Partial<Inspection>, maintenance?: Partial<Maintenance>) {
    const batch = writeBatch(this.firestore);
    
    // 1. Aggiungi Veicolo
    const vehicleRef = doc(collection(this.firestore, 'vehicles'));
    batch.set(vehicleRef, { ...vehicle, createdAt: Timestamp.now() });
    const vehicleId = vehicleRef.id;

    // 2. Assicurazione
    if (insurance && insurance.company && insurance.expiryDate) {
      const insRef = doc(collection(this.firestore, 'insurances'));
      batch.set(insRef, { ...insurance, vehicleId, vehiclePlate: vehicle.plate });
    }

    // 3. Revisione
    if (inspection && inspection.expiryDate) {
      const inspRef = doc(collection(this.firestore, 'inspections'));
      batch.set(inspRef, { ...inspection, vehicleId, vehiclePlate: vehicle.plate });
    }

    // 4. Manutenzione
    if (maintenance && maintenance.description && maintenance.date) {
      const maintRef = doc(collection(this.firestore, 'maintenances'));
      batch.set(maintRef, { ...maintenance, vehicleId, vehiclePlate: vehicle.plate });
    }

    return batch.commit();
  }

  /** Aggiorna un veicolo e i suoi dettagli correlati (assicurazione, revisione, manutenzione) */
  async updateVehicleWithDetails(vehicleId: string, vehicle: Partial<Vehicle>, insurance?: Partial<Insurance>, inspection?: Partial<Inspection>, maintenance?: Partial<Maintenance>) {
    const batch = writeBatch(this.firestore);
    
    // 1. Aggiorna Veicolo
    const vehicleRef = doc(this.firestore, `vehicles/${vehicleId}`);
    batch.update(vehicleRef, vehicle);

    // Per semplicità, se passati, aggiorniamo o creiamo il record più recente.
    // In questo contesto, se l'utente modifica i dati nel tab veicoli, intendiamo l'ultimo record.
    
    // 2. Assicurazione
    if (insurance && insurance.company && insurance.expiryDate) {
      if (insurance.id) {
        const insRef = doc(this.firestore, `insurances/${insurance.id}`);
        batch.update(insRef, { ...insurance, vehiclePlate: vehicle.plate || (insurance as any).vehiclePlate });
      } else {
        const insRef = doc(collection(this.firestore, 'insurances'));
        batch.set(insRef, { ...insurance, vehicleId, vehiclePlate: vehicle.plate || (insurance as any).vehiclePlate });
      }
    }

    // 3. Revisione
    if (inspection && inspection.expiryDate) {
      if (inspection.id) {
        const inspRef = doc(this.firestore, `inspections/${inspection.id}`);
        batch.update(inspRef, { ...inspection, vehiclePlate: vehicle.plate || (inspection as any).vehiclePlate });
      } else {
        const inspRef = doc(collection(this.firestore, 'inspections'));
        batch.set(inspRef, { ...inspection, vehicleId, vehiclePlate: vehicle.plate || (inspection as any).vehiclePlate });
      }
    }

    // 4. Manutenzione
    if (maintenance && maintenance.description && maintenance.date) {
      if (maintenance.id) {
        const maintRef = doc(this.firestore, `maintenances/${maintenance.id}`);
        batch.update(maintRef, { ...maintenance, vehiclePlate: vehicle.plate || (maintenance as any).vehiclePlate });
      } else {
        const maintRef = doc(collection(this.firestore, 'maintenances'));
        batch.set(maintRef, { ...maintenance, vehicleId, vehiclePlate: vehicle.plate || (maintenance as any).vehiclePlate });
      }
    }

    return batch.commit();
  }

  async getLatestInsurance(vehicleId: string): Promise<Insurance | null> {
    const ref = collection(this.firestore, 'insurances');
    const q = query(ref, where('vehicleId', '==', vehicleId));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    
    // Sort in memory to avoid composite index requirement
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Insurance));
    docs.sort((a, b) => {
      const dateA = (a.expiryDate as any)?.seconds || 0;
      const dateB = (b.expiryDate as any)?.seconds || 0;
      return dateB - dateA;
    });
    
    return docs[0];
  }

  async getLatestInspection(vehicleId: string): Promise<Inspection | null> {
    const ref = collection(this.firestore, 'inspections');
    const q = query(ref, where('vehicleId', '==', vehicleId));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    // Sort in memory
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Inspection));
    docs.sort((a, b) => {
      const dateA = (a.expiryDate as any)?.seconds || 0;
      const dateB = (b.expiryDate as any)?.seconds || 0;
      return dateB - dateA;
    });

    return docs[0];
  }

  async getLatestMaintenance(vehicleId: string): Promise<Maintenance | null> {
    const ref = collection(this.firestore, 'maintenances');
    const q = query(ref, where('vehicleId', '==', vehicleId));
    const snap = await getDocs(q);
    if (snap.empty) return null;

    // Sort in memory
    const docs = snap.docs.map(d => ({ id: d.id, ...d.data() } as Maintenance));
    docs.sort((a, b) => {
      const dateA = (a.date as any)?.seconds || 0;
      const dateB = (b.date as any)?.seconds || 0;
      return dateB - dateA;
    });

    return docs[0];
  }

  // ==========================================
  // GESTIONE NOLEGGI (IL "FOGLIO EXCEL")
  // ==========================================

  /** * Recupera i noleggi. Questo è fondamentale per visualizzare il "foglio" della sede.
   * Restituirà i noleggi ordinati per data di inizio.
   */
  getRentals(location?: string): Observable<Rental[]> {
    if (!this.rentals$) {
      const rentalsRef = collection(this.firestore, 'rentals');
      this.rentals$ = (collectionData(rentalsRef, { idField: 'id' }) as Observable<Rental[]>).pipe(
        map(rentals => {
          // Sort in memory to avoid composite index requirement for location + startDate
          rentals.sort((a, b) => {
            const dateA = (a.startDate as any)?.seconds || 0;
            const dateB = (b.startDate as any)?.seconds || 0;
            return dateB - dateA;
          });
          return rentals;
        }),
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }

    if (location) {
      return this.rentals$.pipe(
        map(rentals => rentals.filter(r => r.location === location))
      );
    }
    return this.rentals$;
  }

  /** Registra un nuovo noleggio */
  async createRental(rental: Rental) {
    const rentalsRef = collection(this.firestore, 'rentals');
    const docRef = await addDoc(rentalsRef, { ...rental, createdAt: Timestamp.now() });
    
    // Aggiorna sempre la sede del veicolo con la sede di rientro (o la sede del noleggio se non specificata)
    // per riflettere lo spostamento automatico del veicolo.
    const targetLocation = rental.returnLocation || rental.location;
    if (targetLocation) {
      await this.updateVehicle(rental.vehicleId, { location: targetLocation });
    }
    
    return docRef;
  }

  /** Modifica un noleggio (es. se il cliente allunga i giorni o annulla) */
  async updateRental(id: string, data: Partial<Rental>) {
    const docRef = doc(this.firestore, `rentals/${id}`);
    await updateDoc(docRef, data);
    
    const targetLocation = data.returnLocation || data.location;
    if (targetLocation && data.vehicleId) {
      await this.updateVehicle(data.vehicleId, { location: targetLocation });
    }
  }

  // ==========================================
  // GESTIONE TRASFERIMENTI E MANUTENZIONI (CALENDARIO)
  // ==========================================

  getTemporaryTransfers(): Observable<TemporaryTransfer[]> {
    if (!this.temporaryTransfers$) {
      const ref = collection(this.firestore, 'temporary_transfers');
      this.temporaryTransfers$ = runInInjectionContext(this.injector, () => {
        return (collectionData(ref, { idField: 'id' }) as Observable<TemporaryTransfer[]>).pipe(
          shareReplay({ bufferSize: 1, refCount: false })
        );
      });
    }
    return this.temporaryTransfers$;
  }

  async addTemporaryTransfer(transfer: TemporaryTransfer) {
    const ref = collection(this.firestore, 'temporary_transfers');
    return addDoc(ref, { ...transfer, createdAt: Timestamp.now() });
  }

  async deleteTemporaryTransfer(id: string) {
    const docRef = doc(this.firestore, `temporary_transfers/${id}`);
    return deleteDoc(docRef);
  }

  getMaintenancePeriods(): Observable<MaintenancePeriod[]> {
    if (!this.maintenancePeriods$) {
      const ref = collection(this.firestore, 'maintenance_periods');
      this.maintenancePeriods$ = runInInjectionContext(this.injector, () => {
        return (collectionData(ref, { idField: 'id' }) as Observable<MaintenancePeriod[]>).pipe(
          shareReplay({ bufferSize: 1, refCount: false })
        );
      });
    }
    return this.maintenancePeriods$;
  }

  async addMaintenancePeriod(period: MaintenancePeriod) {
    const ref = collection(this.firestore, 'maintenance_periods');
    return addDoc(ref, { ...period, createdAt: Timestamp.now() });
  }

  async deleteMaintenancePeriod(id: string) {
    const docRef = doc(this.firestore, `maintenance_periods/${id}`);
    return deleteDoc(docRef);
  }

  async updateTemporaryTransfer(id: string, data: Partial<TemporaryTransfer>) {
    const docRef = doc(this.firestore, `temporary_transfers/${id}`);
    return updateDoc(docRef, data);
  }

  async updateMaintenancePeriod(id: string, data: Partial<MaintenancePeriod>) {
    const docRef = doc(this.firestore, `maintenance_periods/${id}`);
    return updateDoc(docRef, data);
  }

  /**
   * Calcola lo stato teorico di un noleggio in base alle date.
   * Utile per aggiornamenti automatici.
   */
  calculateStatus(rental: Rental): 'Prenotato' | 'In Corso' | 'Concluso' | 'Cancellato' {
    if (rental.status === 'Cancellato') return 'Cancellato';

    const now = new Date();
    const start = rental.startDate instanceof Timestamp ? rental.startDate.toDate() : new Date(rental.startDate);
    const end = rental.endDate instanceof Timestamp ? rental.endDate.toDate() : new Date(rental.endDate);

    // Reset ore per confronto solo date (opzionale, ma consigliato per precisione "giornaliera")
    const nowTime = now.getTime();
    const startTime = start.getTime();
    const endTime = end.getTime();

    if (nowTime < startTime) {
      return 'Prenotato';
    } else if (nowTime >= startTime && nowTime <= endTime) {
      return 'In Corso';
    } else {
      return 'Concluso';
    }
  }

  /** Elimina un noleggio (se inserito per sbaglio) e ripristina lo stato/sede precedente del veicolo */
  async deleteRental(id: string) {
    const docRef = doc(this.firestore, `rentals/${id}`);
    
    try {
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const rental = snap.data() as Rental;
        if (rental.vehicleId && rental.location) {
          // Ripristina la sede originale del veicolo prima del noleggio
          await this.updateVehicle(rental.vehicleId, { location: rental.location });
        }
      }
    } catch (e) {
      console.error("Impossibile recuperare i dettagli del noleggio per ripristinare il veicolo:", e);
    }

    // Trova ed elimina anche eventuali contratti associati a questo rentalId
    try {
      const contractsRef = collection(this.firestore, 'contracts');
      const q = query(contractsRef, where('rentalId', '==', id));
      const contractsSnap = await getDocs(q);
      for (const contractDoc of contractsSnap.docs) {
        await deleteDoc(doc(this.firestore, `contracts/${contractDoc.id}`));
      }
    } catch (e) {
      console.error("Errore durante l'eliminazione dei contratti associati al noleggio:", e);
    }

    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE ASSICURAZIONI, REVISIONI, MANUTENZIONI
  // ==========================================

  getInsurances(): Observable<Insurance[]> {
    if (!this.insurances$) {
      const ref = collection(this.firestore, 'insurances');
      const q = query(ref, orderBy('expiryDate', 'asc'));
      this.insurances$ = (collectionData(q, { idField: 'id' }) as Observable<Insurance[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.insurances$;
  }

  async addInsurance(insurance: Insurance) {
    const ref = collection(this.firestore, 'insurances');
    return addDoc(ref, { ...insurance, createdAt: Timestamp.now() });
  }

  getInspections(): Observable<Inspection[]> {
    if (!this.inspections$) {
      const ref = collection(this.firestore, 'inspections');
      const q = query(ref, orderBy('expiryDate', 'asc'));
      this.inspections$ = (collectionData(q, { idField: 'id' }) as Observable<Inspection[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.inspections$;
  }

  async addInspection(inspection: Inspection) {
    const ref = collection(this.firestore, 'inspections');
    return addDoc(ref, { ...inspection, createdAt: Timestamp.now() });
  }

  getMaintenances(): Observable<Maintenance[]> {
    if (!this.maintenances$) {
      const ref = collection(this.firestore, 'maintenances');
      const q = query(ref, orderBy('date', 'desc'));
      this.maintenances$ = (collectionData(q, { idField: 'id' }) as Observable<Maintenance[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.maintenances$;
  }

  async addMaintenance(maintenance: Maintenance) {
    const ref = collection(this.firestore, 'maintenances');
    return addDoc(ref, { ...maintenance, createdAt: Timestamp.now() });
  }

  async updateMaintenance(id: string, data: Partial<Maintenance>) {
    const docRef = doc(this.firestore, `maintenances/${id}`);
    return updateDoc(docRef, data);
  }

  async deleteMaintenance(id: string) {
    const docRef = doc(this.firestore, `maintenances/${id}`);
    return deleteDoc(docRef);
  }

  async updateInsurance(id: string, data: Partial<Insurance>) {
    const docRef = doc(this.firestore, `insurances/${id}`);
    return updateDoc(docRef, data);
  }

  async deleteInsurance(id: string) {
    const docRef = doc(this.firestore, `insurances/${id}`);
    return deleteDoc(docRef);
  }

  async updateInspection(id: string, data: Partial<Inspection>) {
    const docRef = doc(this.firestore, `inspections/${id}`);
    return updateDoc(docRef, data);
  }

  async deleteInspection(id: string) {
    const docRef = doc(this.firestore, `inspections/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE CLIENTI
  // ==========================================

  getCustomers(): Observable<Customer[]> {
    if (!this.customers$) {
      const ref = collection(this.firestore, 'customers');
      const q = query(ref, orderBy('lastName'));
      this.customers$ = (collectionData(q, { idField: 'id' }) as Observable<Customer[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.customers$;
  }

  async addCustomer(customer: Customer) {
    const ref = collection(this.firestore, 'customers');
    return addDoc(ref, this.cleanUndefined({ ...customer, createdAt: Timestamp.now() }));
  }

  async updateCustomer(id: string, data: Partial<Customer>) {
    const docRef = doc(this.firestore, `customers/${id}`);
    return updateDoc(docRef, this.cleanUndefined(data));
  }

  async deleteCustomer(id: string) {
    const docRef = doc(this.firestore, `customers/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE AZIENDE
  // ==========================================

  getCompanies(): Observable<Company[]> {
    if (!this.companies$) {
      const ref = collection(this.firestore, 'companies');
      const q = query(ref, orderBy('name'));
      this.companies$ = (collectionData(q, { idField: 'id' }) as Observable<Company[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.companies$;
  }

  async addCompany(company: Company) {
    const ref = collection(this.firestore, 'companies');
    return addDoc(ref, { ...company, createdAt: Timestamp.now() });
  }

  async updateCompany(id: string, data: Partial<Company>) {
    const docRef = doc(this.firestore, `companies/${id}`);
    return updateDoc(docRef, data);
  }

  async deleteCompany(id: string) {
    const docRef = doc(this.firestore, `companies/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // ELIMINAZIONE VEICOLO (STORICO CONSERVATO)
  // ==========================================

  async deleteVehicle(id: string) {
    const vehicleRef = doc(this.firestore, `vehicles/${id}`);
    return deleteDoc(vehicleRef);
  }

  // ==========================================
  // GESTIONE PROMEMORIA (REMINDERS)
  // ==========================================

  getReminders(): Observable<Reminder[]> {
    if (!this.reminders$) {
      const ref = collection(this.firestore, 'reminders');
      const q = query(ref, orderBy('date', 'asc'));
      this.reminders$ = (collectionData(q, { idField: 'id' }) as Observable<Reminder[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.reminders$;
  }

  async addReminder(reminder: Reminder) {
    const ref = collection(this.firestore, 'reminders');
    return addDoc(ref, { ...reminder, createdAt: Timestamp.now() });
  }

  async updateReminder(id: string, data: Partial<Reminder>) {
    const docRef = doc(this.firestore, `reminders/${id}`);
    return updateDoc(docRef, data);
  }

  async toggleReminderCompletion(reminder: Reminder) {
    if (!reminder.id) return;

    const isCurrentlyCompleted = !!reminder.completed;

    if (!isCurrentlyCompleted && reminder.repeat && reminder.repeat !== 'none') {
      // It's a recurring reminder being marked as completed.
      // Advance the active reminder's date.
      const nextDate = this.calculateNextOccurrence(reminder.date.toDate(), reminder.repeat);
      await this.updateReminder(reminder.id, {
        date: Timestamp.fromDate(nextDate),
        completed: false // make sure it remains active
      });
    } else {
      // Normal toggle (either non-recurring, or historical completed being reopened)
      await this.updateReminder(reminder.id, {
        completed: !isCurrentlyCompleted
      });
    }
  }

  private calculateNextOccurrence(currentDate: Date, repeat: string): Date {
    const next = new Date(currentDate);
    switch (repeat) {
      case 'hourly':
        next.setHours(next.getHours() + 1);
        break;
      case 'every_2_hours':
        next.setHours(next.getHours() + 2);
        break;
      case 'every_4_hours':
        next.setHours(next.getHours() + 4);
        break;
      case 'every_8_hours':
        next.setHours(next.getHours() + 8);
        break;
      case 'every_12_hours':
        next.setHours(next.getHours() + 12);
        break;
      case 'daily':
        next.setDate(next.getDate() + 1);
        break;
      case 'weekly':
        next.setDate(next.getDate() + 7);
        break;
      case 'monthly':
        next.setMonth(next.getMonth() + 1);
        break;
      case 'yearly':
        next.setFullYear(next.getFullYear() + 1);
        break;
    }
    return next;
  }

  async deleteReminder(id: string) {
    const docRef = doc(this.firestore, `reminders/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE CONTRATTI (CONTRACTS HISTORY)
  // ==========================================

  getContracts(): Observable<ContractDocument[]> {
    if (!this.contracts$) {
      const ref = collection(this.firestore, 'contracts');
      const q = query(ref, orderBy('date', 'desc'));
      this.contracts$ = (collectionData(q, { idField: 'id' }) as Observable<ContractDocument[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.contracts$;
  }

  getNextContractNumber(): Observable<number> {
    const counterRef = collection(this.firestore, 'counters');
    const contractsRef = collection(this.firestore, 'contracts');
    const q = query(contractsRef, orderBy('date', 'desc'), limit(10));

    return combineLatest([
      collectionData(counterRef, { idField: 'id' }) as Observable<any[]>,
      collectionData(q, { idField: 'id' }) as Observable<ContractDocument[]>
    ]).pipe(
      map(([counters, contracts]) => {
        const contractCounter = counters?.find(c => c.id === 'contracts');
        const maxFromCounter = contractCounter?.lastContractNumber ? Number(contractCounter.lastContractNumber) : 730;

        let maxFromContracts = 730;
        if (contracts && contracts.length > 0) {
          const nums = contracts
            .map(c => parseInt(c.contractNumber, 10))
            .filter(n => !isNaN(n));
          if (nums.length > 0) {
            maxFromContracts = Math.max(...nums);
          }
        }

        const max = Math.max(maxFromCounter, maxFromContracts);
        return max + 1;
      })
    );
  }

  private cleanUndefined(obj: any): any {
    if (obj === null || obj === undefined) {
      return null;
    }
    if (typeof obj !== 'object') {
      return obj;
    }
    if (obj instanceof Timestamp || obj instanceof Date) {
      return obj;
    }
    const result: any = Array.isArray(obj) ? [] : {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val !== undefined) {
        result[key] = this.cleanUndefined(val);
      }
    }
    return result;
  }

  async createContract(contract: ContractDocument, cargosData?: any) {
    const docRef = doc(this.firestore, `contracts/${contract.contractNumber}`);
    const dataToSave = {
      ...contract,
      ...(cargosData || {}),
      createdAt: Timestamp.now()
    };

    // Aggiorna progressivamente il contatore massimo dei contratti per evitare riciclo di numeri già emessi
    const num = parseInt(contract.contractNumber, 10);
    if (!isNaN(num)) {
      try {
        const counterDocRef = doc(this.firestore, 'counters/contracts');
        const counterSnap = await getDoc(counterDocRef);
        const currentCounter = counterSnap.exists() ? (counterSnap.data()?.['lastContractNumber'] || 0) : 0;
        if (num > currentCounter) {
          await setDoc(counterDocRef, {
            lastContractNumber: num,
            updatedAt: Timestamp.now()
          }, { merge: true });
        }
      } catch (counterError) {
        console.error("Errore nell'aggiornamento del contatore contratti:", counterError);
      }
    }

    return setDoc(docRef, this.cleanUndefined(dataToSave));
  }

  async deleteContract(id: string) {
    const docRef = doc(this.firestore, `contracts/${id}`);
    return deleteDoc(docRef);
  }

  async updateContract(id: string, data: Partial<ContractDocument>) {
    const docRef = doc(this.firestore, `contracts/${id}`);
    return updateDoc(docRef, this.cleanUndefined(data));
  }

  // --- CARGOS INTEGRATION HELPER METHODS ---

  mapToCargosFormat(rental: Rental, vehicle: Vehicle, customer: Customer, details: any, date: Timestamp): any {
    const formatDateTime = (d: any): string => {
      if (!d) return '';
      let dateObj: Date;
      if (d instanceof Date) {
        dateObj = d;
      } else if (d instanceof Timestamp) {
        dateObj = d.toDate();
      } else if (d && typeof d.toDate === 'function') {
        dateObj = d.toDate();
      } else if (d && typeof d.seconds === 'number') {
        dateObj = new Date(d.seconds * 1000);
      } else {
        dateObj = new Date(d);
      }
      if (isNaN(dateObj.getTime())) dateObj = new Date();
      const dd = String(dateObj.getDate()).padStart(2, '0');
      const mm = String(dateObj.getMonth() + 1).padStart(2, '0');
      const yyyy = dateObj.getFullYear();
      const hh = String(dateObj.getHours()).padStart(2, '0');
      const min = String(dateObj.getMinutes()).padStart(2, '0');
      return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
    };

    const formatTimestampWithTime = (t: any, timeStr?: string): string => {
      if (!t) return `20/08/2026 ${timeStr || '12:00'}`;
      let d: Date;
      if (t instanceof Timestamp) {
        d = t.toDate();
      } else if (t && typeof t.toDate === 'function') {
        d = t.toDate();
      } else if (t && typeof t.seconds === 'number') {
        d = new Date(t.seconds * 1000);
      } else {
        d = new Date(t);
      }
      if (isNaN(d.getTime())) d = new Date();
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      let time = timeStr || '12:00';
      
      // Clean and normalize time string (replace . or , with :)
      time = time.replace(/[.,]/g, ':').trim();
      // Ensure there are 2 digits for hours and minutes (e.g. "8:30" -> "08:30")
      if (time.includes(':')) {
        const parts = time.split(':');
        const hours = parts[0].padStart(2, '0');
        const minutes = parts[1].padEnd(2, '0');
        time = `${hours}:${minutes}`;
      }
      return `${dd}/${mm}/${yyyy} ${time}`;
    };

    const formatBirthDate = (dVal: any): string => {
      if (!dVal) return '15/05/1985'; // Default fallback birthdate
      let d: Date;
      if (dVal instanceof Timestamp) {
        d = dVal.toDate();
      } else if (dVal.toDate) {
        d = dVal.toDate();
      } else if (dVal && typeof dVal.seconds === 'number') {
        d = new Date(dVal.seconds * 1000);
      } else {
        d = new Date(dVal);
      }
      if (isNaN(d.getTime())) return '15/05/1985';
      const dd = String(d.getDate()).padStart(2, '0');
      const mm = String(d.getMonth() + 1).padStart(2, '0');
      const yyyy = d.getFullYear();
      return `${dd}/${mm}/${yyyy}`;
    };

    const branchAddresses: { [key: string]: string } = {
      'Mottola': 'Via S. Allende 1, Mottola (TA)',
      'Massafra': 'Viale Marconi, Massafra (TA)',
      'Grottaglie': 'Via Taranto, Grottaglie (TA)'
    };

    const checkOutAddr = branchAddresses[rental.location] || 'Via S. Allende 1, Mottola (TA)';
    const checkInAddr = branchAddresses[rental.returnLocation || rental.location] || checkOutAddr;

    const categoryLower = (vehicle.category || '').toLowerCase();
    let veicoloTipoDesc = 'autovetture';
    
    if (categoryLower.includes('autocaravan') || categoryLower.includes('camper')) {
      veicoloTipoDesc = 'autocaravan';
    } else if (categoryLower.includes('autobus')) {
      veicoloTipoDesc = 'autobus';
    } else if (
      categoryLower.includes('autocarro') ||
      categoryLower.includes('cassone') ||
      categoryLower.includes('cassa') ||
      categoryLower.includes('sponda') ||
      categoryLower.includes('ribaltabile') ||
      categoryLower.includes('refrigerato') ||
      categoryLower.includes('l3h3') ||
      categoryLower.includes('l4h3')
    ) {
      veicoloTipoDesc = 'autocarri';
    } else if (
      categoryLower.includes('furgon') ||
      categoryLower.includes('van') ||
      categoryLower.includes('l1h1') ||
      categoryLower.includes('l2h1') ||
      categoryLower.includes('l2h2')
    ) {
      veicoloTipoDesc = 'furgoni';
    }

    const veicoloTipo = (veicoloTipoDesc === 'furgoni' || veicoloTipoDesc === 'autocarri') ? '1' : '2';
    const licenseNum = details.driverLicenseNumber || customer.licenseNumber || 'PA987654321';

    const checkoutLuogo = rental.location || 'Mottola';
    const checkinLuogo = rental.returnLocation || rental.location || 'Mottola';
    const nascitaLuogo = customer.birthPlace || details.driverBirthPlace || 'Mottola';
    const rilascioLuogo = details.driverLicenseReleasedBy || customer.licenseReleasedBy || customer.birthPlace || details.driverBirthPlace || rental.location || 'Mottola';

    const patentePaese = details.driverLicenseCountry || customer.licenseCountry || 'Italia';

    return {
      contratto_id: details.contractNumber || '',
      contratto_data: formatDateTime(date),
      contratto_tipop: "0",
      contratto_checkout_data: formatTimestampWithTime(rental.startDate, details.timeOut),
      contratto_checkout_luogo: checkoutLuogo,
      contratto_checkout_indirizzo: checkOutAddr,
      contratto_checkin_data: formatTimestampWithTime(rental.endDate, details.timeIn),
      contratto_checkin_luogo: checkinLuogo,
      contratto_checkin_indirizzo: checkInAddr,
      operatore_id: "ROMANELLI MINA",
      agenzia_id: "AG-0012",
      agenzia_nome: "LA DOLCE VITA",
      agenzia_luogo: "Mottola",
      agenzia_indirizzo: "Piazza Duomo 1, Milano",
      agenzia_recapito_tel: "02123456",
      veicolo_tipo: veicoloTipo,
      veicolo_tipo_desc: veicoloTipoDesc,
      veicolo_marca: vehicle.brand || 'Fiat',
      veicolo_modello: vehicle.model || 'Panda',
      veicolo_targa: vehicle.plate || 'AB123CD',
      conducente_contraente_cognome: (customer.lastName || 'ROSSI').toUpperCase(),
      conducente_contraente_nome: (customer.firstName || 'MARIO').toUpperCase(),
      conducente_contraente_nascita_data: formatBirthDate(customer.birthDate),
      conducente_contraente_nascita_luogo: nascitaLuogo,
      conducente_contraente_cittadinanza: "Italia",
      conducente_contraente_docide_tipo_cod: "PATENTE DI GUIDA",
      conducente_contraente_docide_numero: licenseNum,
      conducente_contraente_docide_luogoril: rilascioLuogo,
      conducente_contraente_docide_luogoril_paese: patentePaese,
      conducente_contraente_patente_numero: licenseNum,
      conducente_contraente_patente_luogoril: rilascioLuogo,
      conducente_contraente_patente_luogoril_paese: patentePaese,
      conducente_contraente_recapito: customer.phone || '+393331234567'
    };
  }

  checkCargosContract(contractNumber: string): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/v1/cargos/contracts/${contractNumber}/check`;
    return this.http.post(url, {});
  }

  sendCargosContract(contractNumber: string): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/v1/cargos/contracts/${contractNumber}/send`;
    return this.http.post(url, {});
  }

  sendBulkContracts(contractIds: string[]): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/v1/cargos/contracts/send-bulk`;
    return this.http.post(url, contractIds);
  }

  downloadContractPdf(contractNumber: string): Observable<Blob> {
    const timestamp = new Date().getTime();
    const url = `${API_CONFIG.baseUrl}/api/v1/contracts/${contractNumber}/pdf?t=${timestamp}&force=true`;
    return this.http.get(url, { responseType: 'blob' });
  }

  // ==========================================
  // GESTIONE VERBALI (TRAFFIC VIOLATIONS)
  // ==========================================

  getVerbali(): Observable<Verbale[]> {
    if (!this.verbali$) {
      const ref = collection(this.firestore, 'verbali');
      const q = query(ref, orderBy('createdAt', 'desc'));
      this.verbali$ = (collectionData(q, { idField: 'id' }) as Observable<Verbale[]>).pipe(
        shareReplay({ bufferSize: 1, refCount: false })
      );
    }
    return this.verbali$;
  }

  async createVerbale(verbale: Verbale) {
    const ref = collection(this.firestore, 'verbali');
    return addDoc(ref, { ...verbale, createdAt: Timestamp.now() });
  }

  async updateVerbale(id: string, updates: Partial<Verbale>) {
    const docRef = doc(this.firestore, `verbali/${id}`);
    return updateDoc(docRef, updates);
  }

  async deleteVerbale(id: string) {
    const docRef = doc(this.firestore, `verbali/${id}`);
    return deleteDoc(docRef);
  }

  parseVerbalePdf(file: File): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/v1/verbali/parse`;
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post(url, formData);
  }

  parseVerbaliPdfs(files: File[]): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/verbali/extract`;
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file, file.name);
    });
    return this.http.post(url, formData);
  }

  sendVerbalePec(payload: {
    verbaleId?: string;
    authorityPec: string;
    subject: string;
    body: string;
    attachments: { name: string; data: string; type: string }[];
  }): Observable<any> {
    const url = `${API_CONFIG.baseUrl}/api/v1/verbali/send-pec`;
    return this.http.post(url, payload);
  }
}
