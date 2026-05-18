import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule } from "@ngx-translate/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AboutComponent } from "../about/about.component";
import { ServicesComponent } from "../services/services.component";
import { ContactComponent } from "../contact/contact.component";
import {UpperCasePipe} from "@angular/common";

@Component({
    selector: 'app-home',
    templateUrl: './home.component.html',
    styleUrls: ['./home.component.scss'],
    imports: [
        TranslateModule,
        RouterLink,
        RouterOutlet,
        AboutComponent,
        ServicesComponent,
        UpperCasePipe
    ],
    standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
    private host = inject(ElementRef<HTMLElement>);
    private observer?: IntersectionObserver;
    showBackToTop = false;

    // --- NUOVE VARIABILI PER LO SLIDER (CON IMMAGINI UNSPLASH) ---
    backgroundImages: string[] = [
        '/assets/images/fotoFamiglia.jpg', // Auto su strada al tramonto
        'https://images.unsplash.com/photo-1519641471654-76ce0107ad1b?q=80&w=2071&auto=format&fit=crop', // Furgone/Van in viaggio
        'https://images.unsplash.com/photo-1529369623266-f5264b696110?q=80&w=1974&auto=format&fit=crop'  // Famiglia sorridente in auto
    ];
    currentImageIndex = 0;
    slideInterval: any;

    ngOnInit(): void {
        // Avvia lo slider automatico ogni 5 secondi
        this.slideInterval = setInterval(() => {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.backgroundImages.length;
        }, 5000);

        this.slideInterval = setInterval(() => {
            this.currentImageIndex = (this.currentImageIndex + 1) % this.backgroundImages.length;
        }, 5000);

        // NUOVO: Slider Promo
        this.promoInterval = setInterval(() => {
            this.currentPromoIndex = (this.currentPromoIndex + 1) % this.promoImages.length;
        }, 4000);
    }

    ngAfterViewInit(): void {
        // Logica esistente per l'animazione allo scroll
        const elements = this.host.nativeElement.querySelectorAll('.reveal-on-scroll') as NodeListOf<HTMLElement>;

        this.observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add('is-visible');
                        this.observer?.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.15,
                rootMargin: '0px 0px -10% 0px'
            }
        );

        elements.forEach((element) => this.observer?.observe(element));
    }

    ngOnDestroy(): void {
        this.observer?.disconnect();

        if (this.slideInterval) {
            clearInterval(this.slideInterval);
        }
        // NUOVO: Ferma lo slider promo
        if (this.promoInterval) {
            clearInterval(this.promoInterval);
        }

        // Ferma lo slider quando si cambia pagina (fondamentale per evitare bug)
        if (this.slideInterval) {
            clearInterval(this.slideInterval);
        }
    }

    @HostListener('window:scroll')
    onScroll(): void {
        this.showBackToTop = window.scrollY > 400;
    }

    scrollToTop(): void {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    reviews = [
        {
            name: 'francesco recchia',
            text: '"Ho dovuto prendere un furgone a noleggio per 4 giorni per recarmi a Milano, prezzo ottimo, una gentilezza e cortesia da parte del titolare e delle ragazze del front office senza eguali, durante il noleggio assistenza totale per qualsiasi dubbio o incertezza, mezzo eficentissimo nuovo... Posso soltanto dire CONSIGLIATISSIMO. Un insieme di professionalità, cortesia e gentilezza. Numeri uno."',
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
            text: '"Abbiamo affittato il camper da Gianluca per 5 gg per le feste di natale e vi posso dire che siamo super soddisfatti sia per quanto riguarda il mezzo e sia per la professionalità di tutto lo staff. Gianluca è un amico e si è sempre comportato da amico, gentile, disponibile, cuore grande, e professionale. Il camper nuovo affidabile pulito e super comodo… Vacanze da Dio grazie a “Dolce Vita Noleggio” un nome una garanzia. Grazie Tony"',
            stars: 5,
            source: 'Google'
        }
    ];

    // Per ciclare le stelline nell'HTML (Angular Control Flow non ha un ciclo 'for i=0; i<n' nativo semplice senza un array)
    getStarsArray(count: number): any[] {
        return new Array(count);
    }

    promoImages: string[] = [
        'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/Fiat%2B500X%2BRosso%2BMetallizzato%2B1600%2BDiesel%2B5-528w.jpg',
        'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/1-528w.jpg',
        'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/la+dolce+vita+4-528w.jpg',
        'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/la+dolce+vita+7-528w.jpg',
        'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/12146673_E_5d8a38b7a7166-528w.jpg'
    ];
    currentPromoIndex = 0;
    promoInterval: any;
}
