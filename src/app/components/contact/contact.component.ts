import { Component, AfterViewInit, OnDestroy, ElementRef, inject } from '@angular/core';
import emailjs, { type EmailJSResponseStatus } from '@emailjs/browser';
import { TranslateModule } from '@ngx-translate/core';
import { FormsModule } from '@angular/forms';
import { CommonModule, Location } from '@angular/common';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'app-contact',
  templateUrl: './contact.component.html',
  styleUrls: ['./contact.component.scss'],
  imports: [
    TranslateModule,
    FormsModule,
    CommonModule,
    RouterLink
  ],
  standalone: true
})
export class ContactComponent implements AfterViewInit, OnDestroy {

  heroImage: string = 'https://images.unsplash.com/photo-1449965408869-eaa3f722e40d?auto=format&fit=crop&q=80&w=2000'; // Immagine premium per contatti (strada/viaggio)
  mapsBgImage: string = 'https://lirp.cdn-website.com/a317c335/dms3rep/multi/opt/GettyImages-1448298941%281%29-2880w.jpg';

  formData = {
    name: '',
    email: '',
    phone: '',
    message: ''
  };

  privacyConsent: boolean = false;
  promoConsent: boolean = false;

  isSending = false;
  submitStatus: 'success' | 'error' | null = null;

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
    }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });

    elements.forEach((el: Element) => this.observer?.observe(el));
  }

  ngOnDestroy(): void {
    this.observer?.disconnect();
  }

  goBack() {
    this.location.back();
  }

  onSubmit() {
    // Controllo di sicurezza aggiuntivo
    if (this.isSending || !this.privacyConsent) return;

    this.isSending = true;
    this.submitStatus = null;

    const serviceID = 'service_qkq37o8';
    const templateID = 'template_f60hvwn';
    const publicKey = 'uEN1UffQP8cXMYs4D';

    emailjs.send(serviceID, templateID, this.formData, publicKey)
        .then((result: EmailJSResponseStatus) => {
          console.log('Email inviata con successo!', result.text);
          this.submitStatus = 'success';
          this.resetForm();
        }, (error) => {
          console.error('Errore durante l\'invio:', error.text);
          this.submitStatus = 'error';
        })
        .finally(() => {
          this.isSending = false;
          // Nasconde il messaggio di successo dopo 5 secondi
          setTimeout(() => this.submitStatus = null, 5000);
        });
  }

  private resetForm() {
    this.formData = {
      name: '',
      email: '',
      phone: '',
      message: ''
    };
    this.privacyConsent = false;
    this.promoConsent = false;
  }
}
