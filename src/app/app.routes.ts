import {Routes} from '@angular/router';
import {HomeComponent} from './components/home/home.component';
import {AboutComponent} from './components/about/about.component';
import {ServicesComponent} from './components/services/services.component';
import {ContactComponent} from './components/contact/contact.component';
import {LoginComponent} from "./components/login/login.component";
import {
    VeicoliCommercialiComponent
} from "./components/service-detail/veicoli-commerciali/veicoli-commerciali.component";
import {LungoTermineComponent} from "./components/service-detail/lungo-termine/lungo-termine.component";
import {ParcoAutoComponent} from "./components/service-detail/parco-auto/parco-auto.component";
import {AutoUsateComponent} from "./components/service-detail/auto-usate/auto-usate.component";
import {AutolavaggioComponent} from "./components/service-detail/autolavaggio/autolavaggio.component";
import {AutonoleggioComponent} from "./components/service-detail/autonoleggio/autonoleggio.component";
import {InformativaPrivacyComponent} from "./components/informativa-privacy/informativa-privacy.component";
import {InformazioniLegaliComponent} from "./components/informazioni-legali/informazioni-legali.component";
import {AdminDashboardComponent} from "./components/admin/admin-dashboard/admin-dashboard.component";
import {AuthGuard} from "@angular/fire/auth-guard";

export const routes: Routes = [
    {path: '', redirectTo: '/home', pathMatch: 'full'},
    {
        path: 'home', component: HomeComponent
    },
    {path: 'about', component: AboutComponent},
    {
        path: 'services',
        children: [
            // Se l'utente va su /services esatto, vede la lista dei servizi
            {path: '', component: ServicesComponent, pathMatch: 'full'},

            // Se va su /services/autonoleggio, vede il dettaglio!
            {path: 'autonoleggio', component: AutonoleggioComponent},
            {path: 'veicoli-commerciali', component: VeicoliCommercialiComponent},
            {path: 'lungo-termine', component: LungoTermineComponent},
            {path: 'parco-auto', component: ParcoAutoComponent},
            {path: 'auto-usate', component: AutoUsateComponent},
            {path: 'autolavaggio', component: AutolavaggioComponent}
        ]
    },
    {path: 'informativa-privacy', component: InformativaPrivacyComponent},
    {path: 'informazioni-legali', component: InformazioniLegaliComponent},
    {path: 'contact', component: ContactComponent},
    {path: 'login', component: LoginComponent},
    {path: 'admin/dashboard', component: AdminDashboardComponent, canActivate: [AuthGuard]},
    {path: '**', redirectTo: '/home'}
];
