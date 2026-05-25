import {inject, Injectable} from '@angular/core';
import {Auth, authState, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, User} from "@angular/fire/auth";
import {Observable} from "rxjs";
//import {FirestoreService} from "./firestore.service";

@Injectable({
  providedIn: 'root',
})
export class AuthService {

  private auth = inject(Auth);
  //private firestoreService = inject(FirestoreService);

  user$: Observable<User | null> = authState(this.auth);

  login(email: string, password: string) {
    return signInWithEmailAndPassword(this.auth, email, password);
  }

  async register(email: string, password: string, firstName: string, lastName: string) {
    const userCredential = await createUserWithEmailAndPassword(this.auth, email, password);
    const user = userCredential.user;
    /*await this.firestoreService.saveUser(user.uid, {
      uid: user.uid,
      email: user.email,
      firstName,
      lastName,
      createdAt: new Date().toISOString()
    });*/
    return userCredential;
  }

  logout() {
    return signOut(this.auth);
  }

}
