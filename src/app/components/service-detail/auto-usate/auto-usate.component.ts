import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { Location } from "@angular/common";


@Component({
  selector: 'app-auto-usate',
  templateUrl: './auto-usate.component.html',
  styleUrls: ['./auto-usate.component.scss'],
  imports: [TranslateModule, RouterLink],
  standalone: true
})
export class AutoUsateComponent implements AfterViewInit, OnDestroy {

  heroImage: string = '/assets/images/autoUsate.webp';
  parallaxBg: string = 'https://images.unsplash.com/photo-1560958089-b8a1929cea89?q=80&w=2000&auto=format&fit=crop';
  infoImage: string = '/assets/images/prenotazione.webp';

  private observer?: IntersectionObserver;
  private el = inject(ElementRef);

  constructor(private location: Location) {
    window.scrollTo(0, 0);
  }

  ngAfterViewInit(): void {
    // Inizializza animazioni scroll
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
