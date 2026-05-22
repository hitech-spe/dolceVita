import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Location } from "@angular/common";
import { TranslateModule } from '@ngx-translate/core'; // IMPORTANTE

@Component({
  selector: 'app-informativa-privacy',
  templateUrl: './informativa-privacy.component.html',
  styleUrls: ['./informativa-privacy.component.scss'],
  imports: [TranslateModule], // AGGIUNTO QUI
  standalone: true
})
export class InformativaPrivacyComponent implements AfterViewInit, OnDestroy {

  heroImage: string = '/assets/images/informativa.webp';

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
    }, {
      threshold: 0.1,
      rootMargin: '0px 0px -50px 0px'
    });

    elements.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  goBack() {
    this.location.back();
  }
}
