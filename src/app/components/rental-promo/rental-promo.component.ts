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
    'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/Fiat%2B500X%2BRosso%2BMetallizzato%2B1600%2BDiesel%2B5-528w.jpg',
    'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/1-528w.jpg',
    'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/la+dolce+vita+4-528w.jpg',
    'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/la+dolce+vita+7-528w.jpg',
    'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/12146673_E_5d8a38b7a7166-528w.jpg'
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
