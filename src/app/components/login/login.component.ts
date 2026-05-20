import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { AuthService } from "../../services/auth.service";
import { LoadingService } from "../../services/loading.service";
import { TranslateModule } from "@ngx-translate/core";

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [FormsModule, TranslateModule],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {

  private authService = inject(AuthService);
  private loadingService = inject(LoadingService);
  private router = inject(Router);

  isLoginMode = true;
  email = '';
  password = '';
  confirmPassword = '';
  firstName = '';
  lastName = '';
  error = '';
  success = '';
  isLoading = false;

  toggleMode() {
    this.isLoginMode = !this.isLoginMode;
    this.error = '';
    this.success = '';
    this.firstName = '';
    this.lastName = '';
  }

  async onSubmit() {
    if (this.isLoading) return;
    this.error = '';
    this.success = '';

    if (!this.isLoginMode) {
      if (!this.firstName || !this.lastName) {
        this.error = 'AUTH.ERROR_REQUIRED_FIELDS';
        return;
      }
      if (this.password !== this.confirmPassword) {
        this.error = 'AUTH.ERROR_MATCH';
        return;
      }
    }

    this.isLoading = true;
    this.loadingService.show();

    try {
      if (this.isLoginMode) {
        await this.authService.login(this.email, this.password);
        await this.router.navigate(['/admin/dashboard']);
      } else {
        await this.authService.register(this.email, this.password, this.firstName, this.lastName);
        this.success = 'AUTH.SUCCESS_REGISTER';
        this.isLoginMode = true;
        this.password = '';
        this.confirmPassword = '';
        this.firstName = '';
        this.lastName = '';
      }
    } catch (err: any) {
      console.error(err);
      this.error = err.message || 'AUTH.ERROR_GENERIC';
    } finally {
      this.isLoading = false;
      this.loadingService.hide();
    }
  }
}
