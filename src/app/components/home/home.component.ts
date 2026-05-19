import { AfterViewInit, Component, ElementRef, HostListener, OnDestroy, OnInit, inject } from '@angular/core';
import { TranslateModule } from "@ngx-translate/core";
import { RouterLink, RouterOutlet } from "@angular/router";
import { AboutComponent } from "../about/about.component";
import { ServicesComponent } from "../services/services.component";
import {RentalPromoComponent} from "../rental-promo/rental-promo.component";
import {TestimonialsComponent} from "../testimonials/testimonials.component";

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
        RentalPromoComponent,
        TestimonialsComponent
    ],
    standalone: true
})
export class HomeComponent implements OnInit, AfterViewInit, OnDestroy {
    private host = inject(ElementRef<HTMLElement>);
    private observer?: IntersectionObserver;
    showBackToTop = false;

    // --- NUOVE VARIABILI PER LO SLIDER (CON IMMAGINI UNSPLASH) ---
    backgroundImages: string[] = [
        'https://lirp.cdn-website.com/168abf2a/dms3rep/multi/opt/Noleggio+Senza+Meta+-+Guagnano+-+Le+-+001-1920w.jpg', // Auto su strada al tramonto
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
}
