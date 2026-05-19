import {Component, HostListener, ElementRef, AfterViewInit, OnDestroy, inject} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";
import {Router, RouterLink, RouterOutlet} from "@angular/router";
import {NgOptimizedImage} from "@angular/common";

@Component({
  selector: 'app-services',
  templateUrl: './services.component.html',
  styleUrls: ['./services.component.scss'],
    imports: [
        TranslateModule,
        NgOptimizedImage
    ],
  standalone: true
})
export class ServicesComponent implements AfterViewInit, OnDestroy {
  private observer?: IntersectionObserver;

  private router = inject(Router);

  constructor(private el: ElementRef) {}

  ngAfterViewInit(): void {
    // Usiamo setTimeout per assicurarci che il DOM sia completamente renderizzato
    setTimeout(() => {
      const cards = this.el.nativeElement.querySelectorAll('.service-card') as NodeListOf<HTMLElement>;

      // Creiamo l'osservatore che guarda se le card entrano nello schermo
      this.observer = new IntersectionObserver(
          (entries) => {
            entries.forEach((entry) => {
              // Quando la card entra nel viewport (almeno all'8% visibile)
              if (entry.isIntersecting) {
                const card = entry.target as HTMLElement;

                // Aggiungiamo la classe che fa partire l'animazione SCSS
                card.classList.add('is-visible');

                // Smettiamo di osservare questa card (l'animazione avviene una sola volta)
                this.observer?.unobserve(card);
              }
            });
          },
          {
            threshold: 0.08, // Scatta quando l'8% della card è visibile
            rootMargin: '0px 0px -50px 0px' // Fa scattare l'animazione leggermente prima che tocchi il fondo
          }
      );

      // Iniziamo ad osservare tutte le card
      cards.forEach((card) => {
        this.observer?.observe(card);
      });
    }, 0);
  }

  ngOnDestroy(): void {
    // Puliamo l'osservatore quando il componente viene distrutto
    this.observer?.disconnect();
  }

    protected goToService(service: string) {
        this.router.navigate(['/services/', service]);
    }
}
