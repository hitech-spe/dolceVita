import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { appConfig } from './app/app.config';

// Intercept and silence Firebase Injection Context warnings in development console
const originalWarn = console.warn;
console.warn = (...args) => {
  if (args[0] && typeof args[0] === 'string' && (
    args[0].includes('outside of an Injection context') || 
    args[0].includes('Firebase API called outside injection context')
  )) {
    return;
  }
  originalWarn(...args);
};

bootstrapApplication(AppComponent, appConfig)
  .catch(err => console.error(err));
