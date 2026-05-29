import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Location } from "@angular/common";

@Component({
  selector: 'app-autonoleggio',
  templateUrl: './autonoleggio.component.html',
  styleUrls: ['./autonoleggio.component.scss'],
  imports: [TranslateModule, RouterLink],
  standalone: true
})
export class AutonoleggioComponent implements AfterViewInit, OnDestroy {

  heroImage: string = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?q=80&w=2070&auto=format&fit=crop';
  detailImage: string = '/assets/images/autonoleggio.webp';

  private observer?: IntersectionObserver;
  private el = inject(ElementRef);

  constructor(private location: Location) {
    window.scrollTo(0, 0);
  }

  ngAfterViewInit(): void {
    const elements = this.el.nativeElement.querySelectorAll('.reveal-on-scroll');

    const options = {
      root: null, // usa il viewport del browser
      threshold: 0.2, // l'elemento deve essere visibile al 20% prima di attivarsi
      rootMargin: '0px 0px -100px 0px' // "anticipa" o "ritarda" l'entrata di 100px dal fondo
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          // Smettiamo di osservare l'elemento una volta animato
          this.observer?.unobserve(entry.target);
        }
      });
    }, options);

    elements.forEach((el: Element) => {
      this.observer?.observe(el);
    });
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  goBack() {
    this.location.back();
  }
}
