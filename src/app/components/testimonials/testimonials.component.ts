import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-testimonials',
  standalone: true,
  imports: [TranslateModule, CommonModule],
  templateUrl: './testimonials.component.html',
  styleUrls: ['./testimonials.component.scss']
})
export class TestimonialsComponent implements AfterViewInit, OnDestroy {
  private host = inject(ElementRef<HTMLElement>);
  private observer?: IntersectionObserver;

  reviews = [
    {
      name: 'francesco recchia',
      text: '"Ho dovuto prendere un furgone a noleggio per 4 giorni per recarmi a Milano..."',
      stars: 5,
      source: 'Google'
    },
    {
      name: 'Andrea Pagliara',
      text: '"Il massimo della professionalità e della cordialità. Super-consigliati."',
      stars: 5,
      source: 'Google'
    },
    {
      name: 'Fix Phone',
      text: '"Abbiamo affittato il camper da Gianluca per 5 gg per le feste di natale..."',
      stars: 5,
      source: 'Google'
    }
  ];

  getStarsArray(count: number): any[] {
    return new Array(count);
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
  }
}
