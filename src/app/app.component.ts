import {Component, DestroyRef, inject} from '@angular/core';
import { TranslateService } from '@ngx-translate/core';
import {Router, RouterOutlet} from "@angular/router";
import {HeaderComponent} from "./shared/header/header.component";
import {SpinnerComponent} from "./shared/spinner/spinner.component";
import {FooterComponent} from "./shared/footer/footer.component";
import {AuthService} from "./services/auth.service";
import {AsyncPipe} from "@angular/common";
import {takeUntilDestroyed} from "@angular/core/rxjs-interop";

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'],
  imports: [
    RouterOutlet,
    HeaderComponent,
    FooterComponent,
    SpinnerComponent,
    AsyncPipe
  ],
  standalone: true
})
export class AppComponent {
  title = 'hi-tech';

  private authService = inject(AuthService);
  private router = inject(Router);
  private destroyRef = inject(DestroyRef);
  user$ = this.authService.user$;

  constructor(private translate: TranslateService) {
    translate.setDefaultLang('it');
    translate.use('it');
  }

  ngOnInit() {
    this.user$
        .pipe(takeUntilDestroyed(this.destroyRef)) // Previene memory leaks
        .subscribe(user => {
          if (user) {
            // Se l'utente è valorizzato, fai il redirect (es. alla home o dashboard)
            this.router.navigate(['/admin/dashboard']);
          }
        });
  }
}
