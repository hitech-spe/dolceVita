import { Injectable, inject } from '@angular/core';
import {
  Firestore,
  collection,
  collectionData,
  addDoc,
  query,
  where,
  doc,
  updateDoc,
  deleteDoc,
  Timestamp,
  orderBy,
  getDocs,
  writeBatch
} from '@angular/fire/firestore';
import { Observable, map } from 'rxjs';

// --- INTERFACCE ---
export interface Vehicle {
  id?: string;
  brand: string;
  model: string;
  plate: string;
  location: 'Mottola' | 'Massafra' | 'Grottaglie';
  category: string; // es. 'Segmento A', 'Furgoni', ecc.
  status: 'Attivo' | 'Manutenzione' | 'Venduto';
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
  status: 'Prenotato' | 'In Corso' | 'Concluso' | 'Cancellato';
  totalPrice?: number;
  notes?: string;
}

export interface Insurance {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  company: string;
  policyNumber: string;
  expiryDate: Timestamp;
  notes?: string;
}

export interface Inspection {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  expiryDate: Timestamp;
  notes?: string;
}

export interface Maintenance {
  id?: string;
  vehicleId: string;
  vehiclePlate: string;
  description: string;
  date: Timestamp;
  cost?: number;
  km?: number;
}

export interface Customer {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: Timestamp;
  licenseNumber: string;
  licenseExpiry: Timestamp;
  phone?: string;
  email?: string;
  attachments?: { name: string, data: string }[]; // Base64 attachments
}

@Injectable({
  providedIn: 'root'
})
export class RentalService {
  private firestore = inject(Firestore);

  // ==========================================
  // GESTIONE VEICOLI (IL PARCO MEZZI)
  // ==========================================

  /** Recupera tutti i veicoli (con filtro opzionale per sede) */
  getVehicles(location?: string): Observable<Vehicle[]> {
    const vehiclesRef = collection(this.firestore, 'vehicles');
    let q = query(vehiclesRef, orderBy('brand')); // Ordina alfabeticamente

    if (location) {
      q = query(vehiclesRef, where('location', '==', location), orderBy('brand'));
    }

    return collectionData(q, { idField: 'id' }) as Observable<Vehicle[]>;
  }

  /** Aggiunge una nuova auto */
  async addVehicle(vehicle: Vehicle) {
    const vehiclesRef = collection(this.firestore, 'vehicles');
    return addDoc(vehiclesRef, vehicle);
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
    batch.set(vehicleRef, vehicle);
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
    const rentalsRef = collection(this.firestore, 'rentals');
    let q = query(rentalsRef);

    if (location) {
      q = query(rentalsRef, where('location', '==', location));
    }

    return (collectionData(q, { idField: 'id' }) as Observable<Rental[]>).pipe(
      map(rentals => {
        // Sort in memory to avoid composite index requirement for location + startDate
        rentals.sort((a, b) => {
          const dateA = (a.startDate as any)?.seconds || 0;
          const dateB = (b.startDate as any)?.seconds || 0;
          return dateB - dateA;
        });

        rentals.forEach(r => {
          const newStatus = this.calculateStatus(r);
          if (r.status !== newStatus) {
            this.updateRental(r.id!, { status: newStatus });
          }
        });
        return rentals;
      })
    );
  }

  /** Registra un nuovo noleggio */
  async createRental(rental: Rental) {
    const rentalsRef = collection(this.firestore, 'rentals');
    return addDoc(rentalsRef, rental);
  }

  /** Modifica un noleggio (es. se il cliente allunga i giorni o annulla) */
  async updateRental(id: string, data: Partial<Rental>) {
    const docRef = doc(this.firestore, `rentals/${id}`);
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

  /** Elimina un noleggio (se inserito per sbaglio) */
  async deleteRental(id: string) {
    const docRef = doc(this.firestore, `rentals/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // GESTIONE ASSICURAZIONI, REVISIONI, MANUTENZIONI
  // ==========================================

  getInsurances(): Observable<Insurance[]> {
    const ref = collection(this.firestore, 'insurances');
    const q = query(ref, orderBy('expiryDate', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Insurance[]>;
  }

  async addInsurance(insurance: Insurance) {
    const ref = collection(this.firestore, 'insurances');
    return addDoc(ref, insurance);
  }

  getInspections(): Observable<Inspection[]> {
    const ref = collection(this.firestore, 'inspections');
    const q = query(ref, orderBy('expiryDate', 'asc'));
    return collectionData(q, { idField: 'id' }) as Observable<Inspection[]>;
  }

  async addInspection(inspection: Inspection) {
    const ref = collection(this.firestore, 'inspections');
    return addDoc(ref, inspection);
  }

  getMaintenances(): Observable<Maintenance[]> {
    const ref = collection(this.firestore, 'maintenances');
    const q = query(ref, orderBy('date', 'desc'));
    return collectionData(q, { idField: 'id' }) as Observable<Maintenance[]>;
  }

  async addMaintenance(maintenance: Maintenance) {
    const ref = collection(this.firestore, 'maintenances');
    return addDoc(ref, maintenance);
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
    const ref = collection(this.firestore, 'customers');
    const q = query(ref, orderBy('lastName'));
    return collectionData(q, { idField: 'id' }) as Observable<Customer[]>;
  }

  async addCustomer(customer: Customer) {
    const ref = collection(this.firestore, 'customers');
    return addDoc(ref, customer);
  }

  async updateCustomer(id: string, data: Partial<Customer>) {
    const docRef = doc(this.firestore, `customers/${id}`);
    return updateDoc(docRef, data);
  }

  async deleteCustomer(id: string) {
    const docRef = doc(this.firestore, `customers/${id}`);
    return deleteDoc(docRef);
  }

  // ==========================================
  // ELIMINAZIONE COMPLETA VEICOLO (CASCATA)
  // ==========================================

  async deleteVehicle(id: string) {
    const batch = writeBatch(this.firestore);

    // 1. Veicolo
    const vehicleRef = doc(this.firestore, `vehicles/${id}`);
    batch.delete(vehicleRef);

    // 2. Noleggi
    const rentalsRef = collection(this.firestore, 'rentals');
    const qRentals = query(rentalsRef, where('vehicleId', '==', id));
    const rentalsSnap = await getDocs(qRentals);
    rentalsSnap.forEach(d => batch.delete(d.ref));

    // 3. Assicurazioni
    const insurancesRef = collection(this.firestore, 'insurances');
    const qInsurances = query(insurancesRef, where('vehicleId', '==', id));
    const insurancesSnap = await getDocs(qInsurances);
    insurancesSnap.forEach(d => batch.delete(d.ref));

    // 4. Revisioni
    const inspectionsRef = collection(this.firestore, 'inspections');
    const qInspections = query(inspectionsRef, where('vehicleId', '==', id));
    const inspectionsSnap = await getDocs(qInspections);
    inspectionsSnap.forEach(d => batch.delete(d.ref));

    // 5. Manutenzioni
    const maintenancesRef = collection(this.firestore, 'maintenances');
    const qMaintenances = query(maintenancesRef, where('vehicleId', '==', id));
    const maintenancesSnap = await getDocs(qMaintenances);
    maintenancesSnap.forEach(d => batch.delete(d.ref));

    return batch.commit();
  }
}
