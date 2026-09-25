import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Auth } from '@angular/fire/auth';
import { from, switchMap, catchError, of } from 'rxjs';

/**
 * Interceptor to automatically add the Firebase ID token in the Authorization header
 * for any outgoing HTTP requests targeting the cargos, contracts, or verbali API backend.
 */
export const cargosAuthInterceptor: HttpInterceptorFn = (req, next) => {
  const isTargetEndpoint =
    req.url.includes('/api/v1/cargos/') ||
    req.url.includes('/api/v1/contracts/') ||
    req.url.includes('/api/v1/verbali/') ||
    req.url.includes('/api/verbali/');

  // Check if the request is targeting our microservice endpoints
  if (isTargetEndpoint) {
    const auth = inject(Auth);
    const currentUser = auth.currentUser;

    if (currentUser) {
      // Use from() to convert Promise<string> returned by getIdToken() to an Observable
      return from(currentUser.getIdToken()).pipe(
        catchError(err => {
          console.error('Error retrieving Firebase ID token in cargosAuthInterceptor:', err);
          return of(null);
        }),
        switchMap(token => {
          if (token) {
            const authReq = req.clone({
              setHeaders: {
                Authorization: `Bearer ${token}`
              }
            });
            return next(authReq);
          }
          return next(req);
        })
      );
    }
  }

  // Pass-through if not targeting microservice endpoints or if no user is signed in
  return next(req);
};
