import { ApplicationConfig, importProvidersFrom, provideZoneChangeDetection } from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { HttpClient, provideHttpClient, withInterceptors, withInterceptorsFromDi } from '@angular/common/http';
import { TranslateModule, TranslateLoader } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { routes } from './app.routes';
import { getFirestore, provideFirestore } from "@angular/fire/firestore";
import { getAuth, provideAuth } from "@angular/fire/auth";
import { initializeApp, provideFirebaseApp } from "@angular/fire/app";
import { LogLevel, setLogLevel } from '@angular/fire';
import { cargosAuthInterceptor } from './interceptors/cargos-auth.interceptor';

export function HttpLoaderFactory(http: HttpClient) {
  return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

const firebaseConfig = {
  apiKey: "AIzaSyBTQWOHZwhhMOc2WATnzKM_a_bHS1cu08I",
  authDomain: "dolcevita-2a909.firebaseapp.com",
  projectId: "dolcevita-2a909",
  storageBucket: "dolcevita-2a909.firebasestorage.app",
  messagingSenderId: "712144549486",
  appId: "1:712144549486:web:882e5cc8394490cabe987f",
  measurementId: "G-WGTXTVCWN1"
};

setLogLevel(LogLevel.SILENT);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(
      routes,
      withInMemoryScrolling({
        anchorScrolling: 'enabled',
        scrollPositionRestoration: 'enabled'
      })
    ),
    provideHttpClient(withInterceptors([cargosAuthInterceptor]), withInterceptorsFromDi()),
    provideFirebaseApp(() => initializeApp(firebaseConfig)),
    provideAuth(() => getAuth()),
    provideFirestore(() => getFirestore()),
    importProvidersFrom(
      TranslateModule.forRoot({
        loader: {
          provide: TranslateLoader,
          useFactory: HttpLoaderFactory,
          deps: [HttpClient]
        }
      })
    )
  ]
};
