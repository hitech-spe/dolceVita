import {inject, Injectable} from '@angular/core';
import {
    Firestore,
    collection,
    addDoc,
    collectionData,
    doc,
    setDoc,
    query,
    updateDoc,
    deleteDoc
} from '@angular/fire/firestore';
import {Observable, firstValueFrom} from "rxjs";
import {Announcement} from "../models/announcement.model";
import {HttpClient} from "@angular/common/http";

interface CloudinaryUploadResponse {
    secure_url: string;
    public_id: string;
}

@Injectable({
    providedIn: 'root',
})
export class FirestoreService {

    private firestore = inject(Firestore);
    private http = inject(HttpClient);

    private readonly cloudinaryCloudName = 'dbtwfuplj';
    private readonly cloudinaryUploadPreset = 'ml_default';

    saveUser(uid: string, data: any) {
        const ref = doc(this.firestore, 'users', uid);
        return setDoc(ref, data);
    }

    saveAnnuncio(annuncio: any) {
        const ref = collection(this.firestore, 'annunci');
        return addDoc(ref, {
            ...annuncio,
            createdAt: new Date().toISOString()
        });
    }

    updateAnnuncio(id: string, annuncio: Omit<Announcement, 'id' | 'createdAt'>) {
        const announcementRef = doc(this.firestore, 'annunci', id);
        return updateDoc(announcementRef, {
            ...annuncio
        });
    }

    async deleteAnnuncio(announcement: Announcement) {
        try {
            // 3. Se l'operazione ha successo, cancella il documento da Firestore
            const docRef = doc(this.firestore, `announcements/${announcement.id}`);
            return deleteDoc(docRef);

        } catch (error) {
            console.error("Errore durante la cancellazione dell'annuncio:", error);
            // Gestisci l'errore, magari mostrando un messaggio all'utente
            throw new Error("Non è stato possibile eliminare l'annuncio completamente.");
        }
    }

    getAnnunci(): Observable<Announcement[]> {
        const ref = collection(this.firestore, 'annunci');
        return collectionData(query(ref), {idField: 'id'}) as Observable<Announcement[]>;
    }

    async uploadImages(files: File[]): Promise<CloudinaryUploadResponse[]> {
        const uploadPromises = files.map(file => this.uploadImage(file));
        return Promise.all(uploadPromises);
    }

    async uploadImage(file: File): Promise<CloudinaryUploadResponse> {

        const formData = new FormData();
        formData.append('file', file);
        formData.append('upload_preset', this.cloudinaryUploadPreset);
        formData.append('folder', 'announcements');

        const endpoint = `https://api.cloudinary.com/v1_1/${this.cloudinaryCloudName}/image/upload`;
        const response = await firstValueFrom(
            this.http.post<CloudinaryUploadResponse>(endpoint, formData)
        );

        if (!response?.secure_url || !response?.public_id) {
            throw new Error('Upload Cloudinary non riuscito: URL o Public ID mancanti.');
        }

        return response;
    }


}
