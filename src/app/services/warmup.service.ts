import { Injectable, inject, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_CONFIG } from '../config/api.config';
import { Subscription, interval, of, catchError } from 'rxjs';

/**
 * Service responsible for keeping the Render backend microservice alive
 * and preventing the 30-60s cold start delay on free/inactivity sleep tiers.
 */
@Injectable({
  providedIn: 'root'
})
export class WarmupService {
  private http = inject(HttpClient);

  readonly isWarmedUp = signal<boolean>(false);
  readonly isWarmingUp = signal<boolean>(false);
  readonly lastPingTimestamp = signal<Date | null>(null);

  private keepAliveSub?: Subscription;

  /**
   * Pings the backend once to trigger its boot sequence if sleeping.
   * Tolerates 401/403 or any HTTP response, as any network hit wakes up Render.
   */
  pingBackend() {
    this.isWarmingUp.set(true);
    const start = Date.now();

    return this.http.get(`${API_CONFIG.baseUrl}/`, { responseType: 'text' }).pipe(
      catchError(error => {
        // Any HTTP response (including 401 Unauthorized from Spring Security)
        // indicates that the container is awake and responding.
        return of(error.status ? `Status: ${error.status}` : 'Awake');
      })
    ).subscribe({
      next: () => {
        const elapsedMs = Date.now() - start;
        this.isWarmingUp.set(false);
        this.isWarmedUp.set(true);
        this.lastPingTimestamp.set(new Date());
        console.debug(`[WarmupService] Backend active (${elapsedMs}ms).`);
      },
      error: () => {
        this.isWarmingUp.set(false);
      }
    });
  }

  /**
   * Starts a keep-alive background ping interval (default: every 10 minutes)
   * to guarantee Render will never enter inactivity sleep while an operator has the tab open.
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
    });
  }

  stopKeepAlive() {
    if (this.keepAliveSub) {
      this.keepAliveSub.unsubscribe();
      this.keepAliveSub = undefined;
    }
  }
}
