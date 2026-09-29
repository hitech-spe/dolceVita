import { Routes } from '@angular/router';
import { AuthGuard } from '@angular/fire/auth-guard';

export const routes: Routes = [
  { path: '', redirectTo: '/home', pathMatch: 'full' },
  {
    path: 'home',
    loadComponent: () => import('./components/home/home.component').then(m => m.HomeComponent)
  },
  {
    path: 'about',
    loadComponent: () => import('./components/about/about.component').then(m => m.AboutComponent)
  },
  {
    path: 'services',
    children: [
      // Se l'utente va su /services esatto, vede la lista dei servizi
      {
        path: '',
        loadComponent: () => import('./components/services/services.component').then(m => m.ServicesComponent),
        pathMatch: 'full'
      },

      // Se va su /services/autonoleggio, vede il dettaglio!
      {
        path: 'autonoleggio',
        loadComponent: () => import('./components/service-detail/autonoleggio/autonoleggio.component').then(m => m.AutonoleggioComponent)
      },
      {
        path: 'veicoli-commerciali',
        loadComponent: () => import('./components/service-detail/veicoli-commerciali/veicoli-commerciali.component').then(m => m.VeicoliCommercialiComponent)
      },
      {
        path: 'lungo-termine',
        loadComponent: () => import('./components/service-detail/lungo-termine/lungo-termine.component').then(m => m.LungoTermineComponent)
      },
      {
        path: 'parco-auto',
        loadComponent: () => import('./components/service-detail/parco-auto/parco-auto.component').then(m => m.ParcoAutoComponent)
      },
      {
        path: 'auto-usate',
        loadComponent: () => import('./components/service-detail/auto-usate/auto-usate.component').then(m => m.AutoUsateComponent)
      },
      {
        path: 'autolavaggio',
        loadComponent: () => import('./components/service-detail/autolavaggio/autolavaggio.component').then(m => m.AutolavaggioComponent)
      }
    ]
  },
  {
    path: 'informativa-privacy',
    loadComponent: () => import('./components/informativa-privacy/informativa-privacy.component').then(m => m.InformativaPrivacyComponent)
  },
  {
    path: 'informazioni-legali',
    loadComponent: () => import('./components/informazioni-legali/informazioni-legali.component').then(m => m.InformazioniLegaliComponent)
  },
  {
    path: 'contact',
    loadComponent: () => import('./components/contact/contact.component').then(m => m.ContactComponent)
  },
  {
    path: 'login',
    loadComponent: () => import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'admin/dashboard',
    loadComponent: () => import('./components/admin/admin-dashboard/admin-dashboard.component').then(m => m.AdminDashboardComponent),
    canActivate: [AuthGuard]
  },
  { path: '**', redirectTo: '/home' }
];
