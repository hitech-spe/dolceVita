import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Auth } from '@angular/fire/auth';
import { API_CONFIG } from '../config/api.config';
import { Subscription, interval, of, catchError } from 'rxjs';

/**
 * Service responsible for keeping the Render backend microservice alive
 * and preventing the 30-60s cold start delay on free/inactivity sleep tiers,
 * warming up Firestore channels and PDFBox, and proactively refreshing Firebase tokens.
 */
@Injectable({
  providedIn: 'root'
})
export class WarmupService {
  private http = inject(HttpClient);
  private auth = inject(Auth, { optional: true });

  readonly isWarmedUp = signal<boolean>(false);
  readonly isWarmingUp = signal<boolean>(false);
  readonly lastPingTimestamp = signal<Date | null>(null);

  private keepAliveSub?: Subscription;

  constructor() {
    if (typeof window !== 'undefined' && typeof document !== 'undefined') {
      const handleUserWakeup = () => {
        const last = this.lastPingTimestamp();
        const now = Date.now();
        const elapsedSinceLastPing = last ? now - last.getTime() : Infinity;

        // Se sono trascorsi più di 2 minuti dall'ultimo ping, risveglia anticipatamente il backend
        if (elapsedSinceLastPing > 2 * 60 * 1000) {
          this.pingBackend();
        }

        // Rinnovo preventivo proattivo del token Firebase Auth se l'utente è autenticato:
        // Evita che la prima richiesta dopo 1-2 ore di inattività subisca la latenza del refresh token
        if (this.auth?.currentUser) {
          const forceRefresh = elapsedSinceLastPing > 40 * 60 * 1000;
          this.auth.currentUser.getIdToken(forceRefresh).catch(err => {
            console.debug('[WarmupService] Token refresh on wakeup:', err);
          });
        }
      };

      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') {
          handleUserWakeup();
        }
      });

      window.addEventListener('focus', () => {
        handleUserWakeup();
      });
    }
  }

  /**
   * Pings the backend deep warmup endpoint (/api/v1/system/warmup) to trigger
   * its boot sequence, warm up Firestore gRPC connections, and initialize PDFBox classes.
   * Tolerates 404/401/403 or any HTTP response, ensuring compatibility with all backend versions.
   */
  pingBackend() {
    this.isWarmingUp.set(true);
    const start = Date.now();
    const warmupUrl = `${API_CONFIG.baseUrl}/api/v1/system/warmup`;

    return this.http.get(warmupUrl, { responseType: 'text' }).pipe(
      catchError(error => {
        // Any HTTP response (including 404 if warmup endpoint not deployed yet, or 401/403)
        // indicates that the container is awake and responding.
        return of(error.status ? `Status: ${error.status}` : 'Awake');
      })
    ).subscribe({
      next: () => {
        const elapsedMs = Date.now() - start;
        this.isWarmingUp.set(false);
        this.isWarmedUp.set(true);
        this.lastPingTimestamp.set(new Date());
        console.debug(`[WarmupService] Backend deep warmup active (${elapsedMs}ms).`);
      },
      error: () => {
        this.isWarmingUp.set(false);
      }
    });
  }

  /**
   * Starts a keep-alive background ping interval (default: every 10 minutes)
   * to guarantee Render will never enter inactivity sleep while an operator has the tab open,
   * keeping Firebase ID tokens valid in background.
   */
  startKeepAlive(intervalMinutes: number = 10) {
    if (this.keepAliveSub && !this.keepAliveSub.closed) {
      return;
    }

    // Ping immediately on start
    this.pingBackend();

    // Set recurring timer
    const intervalMs = intervalMinutes * 60 * 1000;
    this.keepAliveSub = interval(intervalMs).subscribe(() => {
      this.pingBackend();
      if (this.auth?.currentUser) {
        this.auth.currentUser.getIdToken(false).catch(() => {});
      }
    });
  }

  stopKeepAlive() {
    if (this.keepAliveSub) {
      this.keepAliveSub.unsubscribe();
      this.keepAliveSub = undefined;
    }
  }
}
