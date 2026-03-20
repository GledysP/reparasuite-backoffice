import { Component, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { CommonModule } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { finalize, take } from 'rxjs/operators';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'rs-login',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatCheckboxModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss'],
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);

  loading = false;
  error = '';
  hidePassword = true;

  form = this.fb.group({
    usuario: ['', [Validators.required]],
    password: ['', [Validators.required]],
    recordarme: [true],
  });

  togglePassword() {
    this.hidePassword = !this.hidePassword;
  }

  submit() {
    if (this.form.invalid || this.loading) return;

    this.error = '';
    this.loading = true;

    const { usuario, password, recordarme } = this.form.getRawValue();

    try {
      if (recordarme) localStorage.setItem('rs_remember_me', '1');
      else localStorage.removeItem('rs_remember_me');
    } catch {}

    this.auth
      .login(usuario!, password!)
      .pipe(
        take(1),
        finalize(() => (this.loading = false))
      )
      .subscribe({
        next: () => this.router.navigateByUrl('/dashboard'),
        error: (err) => {
          this.error =
            err?.status === 429
              ? 'Demasiados intentos. Intenta más tarde.'
              : 'Credenciales incorrectas o error de conexión';
          console.error('Login error:', err);
        },
      });
  }

  loginWithGoogle() {
    console.log('Google login');
  }

  loginWithFacebook() {
    console.log('Facebook login');
  }

  loginWithApple() {
    console.log('Apple login');
  }
}