import {Component, ElementRef, inject} from '@angular/core';
import {TranslateModule} from "@ngx-translate/core";

@Component({
  selector: 'app-rental-promo',
  imports: [
    TranslateModule
  ],
  templateUrl: './rental-promo.component.html',
  styleUrl: './rental-promo.component.scss',
})
export class RentalPromoComponent {
  private host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  promoImages: string[] = [
    '/assets/images/rental/Fiat500XRosso.webp',
    '/assets/images/rental/JeepGiallo.webp',
    '/assets/images/rental/panda.webp',
    '/assets/images/rental/furgone.webp',
    '/assets/images/rental/furgoneBianco.webp'
  ];
  currentPromoIndex = 0;
  promoInterval: any;

  ngOnInit(): void {
    this.promoInterval = setInterval(() => {
      this.currentPromoIndex = (this.currentPromoIndex + 1) % this.promoImages.length;
    }, 4000);
  }

  ngAfterViewInit(): void {
    const elements = this.host.nativeElement.querySelectorAll('.reveal-on-scroll') as NodeListOf<HTMLElement>;
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          this.observer?.unobserve(entry.target);
        }
      });
    }, { threshold: 0.15, rootMargin: '0px 0px -10% 0px' });

    elements.forEach((element) => this.observer?.observe(element));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
    if (this.promoInterval) clearInterval(this.promoInterval);
  }
}
