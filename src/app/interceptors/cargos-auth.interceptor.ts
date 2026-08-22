import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap, catchError, of } from 'rxjs';

/**
 * Interceptor to automatically add the Firebase ID token in the Authorization header
 * for any outgoing HTTP requests targeting the cargos API backend (/api/v1/cargos/**).
 */
export const cargosAuthInterceptor: HttpInterceptorFn = (req, next) => {
  // Check if the request is targeting the cargos API endpoints
  if (req.url.includes('/api/v1/cargos/')) {
    const auth = inject(Auth);
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Use from() to convert Promise<string> returned by getIdToken() to an Observable
      return from(currentUser.getIdToken()).pipe(
        switchMap(token => {
          const authReq = req.clone({
            setHeaders: {
              Authorization: `Bearer ${token}`
            }
          });
          return next(authReq);
        }),
        catchError(err => {
          console.error('Error retrieving Firebase ID token in cargosAuthInterceptor:', err);
          return next(req);
        })
      );
    }
  }

  // Pass-through if not targeting cargos or if no user is signed in
  return next(req);
};
