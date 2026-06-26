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
  orderBy
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

  // ==========================================
  // GESTIONE NOLEGGI (IL "FOGLIO EXCEL")
  // ==========================================

  /** * Recupera i noleggi. Questo è fondamentale per visualizzare il "foglio" della sede.
   * Restituirà i noleggi ordinati per data di inizio.
   */
  getRentals(location?: string): Observable<Rental[]> {
    const rentalsRef = collection(this.firestore, 'rentals');
    let q = query(rentalsRef, orderBy('startDate', 'desc'));

    if (location) {
      q = query(rentalsRef, where('location', '==', location), orderBy('startDate', 'desc'));
    }

    return (collectionData(q, { idField: 'id' }) as Observable<Rental[]>).pipe(
      map(rentals => {
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
}
