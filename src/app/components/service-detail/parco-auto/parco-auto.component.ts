import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslateModule } from '@ngx-translate/core';
import { CommonModule, Location } from "@angular/common";

interface Car {
  name: string;
  imageUrl: string;
}

interface FleetSegment {
  title: string;
  cars: Car[];
}

@Component({
  selector: 'app-parco-auto',
  templateUrl: './parco-auto.component.html',
  styleUrls: ['./parco-auto.component.scss'],
  imports: [TranslateModule, RouterLink, CommonModule],
  standalone: true
})
export class ParcoAutoComponent implements AfterViewInit, OnDestroy {

  heroImage: string = 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?q=80&w=2000&auto=format&fit=crop'; // Immagine premium per la vetrina

  // Dati del Parco Auto (Puoi sostituire le immagini Unsplash con le tue vere foto dei veicoli)
  fleetData: FleetSegment[] = [
    {
      title: 'Segmento A',
      cars: [
        { name: 'Fiat Panda', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/panda-1600w.jpeg' },
        { name: 'Renault Twingo', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/tWINGO-1600w.jpg' },
        { name: 'Hyundai i10', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/7683bb8001554e8686f667376c308bde-1600w.jpg' },
        { name: 'Fiat 500', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/fiat-500-berlina-2v-ha-1-1600w.webp' }
      ]
    },
    {
      title: 'Segmento B',
      cars: [
        { name: 'Fiat Punto', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/FIAT-PUNTO-METANO-1920w.jpg' },
        { name: 'Fiat Tipo', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/190225_Fiat_Tipo-Sport_01-1920w.jpg' },
        { name: 'Fiat 500L', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/nuova-500L-1920w.webp' }
      ]
    },
    {
      title: 'Segmento C',
      cars: [
        { name: 'Opel Mokka', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/nuova-500L-1920w.webp' },
        { name: 'Fiat 500 X', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/fiat-500x-urban-look-nuove-teverola-casapesenna-1920w.jpg' },
        { name: 'DR 4.0', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/DR-3.0-1920w.webp' },
        { name: 'JEEP RENEGADE', imageUrl: 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/jeep-renegade-limited-ice-alpine-white-br-565x330-1920w.png' }
      ]
    }
  ];

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
      threshold: 0.1, // Abbassato per far apparire prima le card
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
