import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, Location } from "@angular/common";

@Component({
  selector: 'app-lavaggio-auto',
  templateUrl: './autolavaggio.component.html',
  styleUrls: ['./autolavaggio.component.scss'],
  imports: [TranslateModule, CommonModule],
  standalone: true
})
export class AutolavaggioComponent implements AfterViewInit, OnDestroy {

  // Immagini Premium per Lavaggio
  heroImage: string = 'https://images.unsplash.com/photo-1520340356584-f9917d1eea6f?q=80&w=2000&auto=format&fit=crop'; // Auto insaponata, dettaglio premium
  parallaxBg: string = '/assets/images/lavaggioCerchi.webp'; // Interni auto puliti o dettaglio asciugatura
  infoImage: string = '/assets/images/carWash.webp';

  private observer?: IntersectionObserver;
  private el = inject(ElementRef);

  constructor(private location: Location) {
    window.scrollTo(0, 0);
  }

  ngAfterViewInit(): void {
    const elements = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -50px 0px' });

    elements.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  goBack() {
    this.location.back();
  }
}
