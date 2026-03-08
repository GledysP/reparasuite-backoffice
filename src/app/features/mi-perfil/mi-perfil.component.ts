import { Component, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDividerModule } from '@angular/material/divider';

import { finalize } from 'rxjs/operators';

import { AuthService } from '../../core/services/auth.service';
import { MiPerfilService } from './mi-perfil.service';
import type { UsuarioResumen } from '../../core/models/tipos';

@Component({
  selector: 'rs-mi-perfil',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    MatDividerModule,
  ],
  templateUrl: './mi-perfil.component.html',
  styleUrls: ['./mi-perfil.component.scss'],
})
export class MiPerfilComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private perfil = inject(MiPerfilService);
  private snack = inject(MatSnackBar);

  loading = signal(true);
  saving = signal(false);

  user = signal<UsuarioResumen | null>(null);
  userId = signal<string>('');

  initials = computed(() => {
    const name = this.user()?.nombre ?? '';
    const parts = name.trim().split(/\s+/).filter(Boolean);
    const a = parts[0]?.[0] ?? 'A';
    const b = parts[1]?.[0] ?? '';
    return (a + b).toUpperCase();
  });

  form = this.fb.group({
    nombre: ['', [Validators.required, Validators.minLength(2)]],
    usuario: ['', [Validators.required, Validators.minLength(2)]],
    email: ['', [Validators.required, Validators.email]],
    rol: [{ value: '', disabled: true }, [Validators.required]], // readonly, pero se envía con getRawValue()
    activo: [{ value: true, disabled: true }],
  });

  private snapshot: any = null;

  constructor() {
    const id = this.getUserIdFromToken();
    if (!id) {
      this.loading.set(false);
      this.snack.open('No se pudo identificar el usuario (token inválido)', 'OK', { duration: 2600 });
      return;
    }

    this.userId.set(id);
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);

    this.perfil
      .obtener(this.userId())
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.form.patchValue(
            {
              nombre: u.nombre ?? '',
              usuario: u.usuario ?? '',
              email: u.email ?? '',
              rol: String(u.rol ?? ''),
              activo: !!u.activo,
            },
            { emitEvent: false }
          );
          this.snapshot = this.form.getRawValue();
        },
        error: () => {
          this.snack.open('Error al cargar el perfil', 'OK', { duration: 2600 });
        },
      });
  }

  reset(): void {
    if (!this.snapshot) return;
    this.form.reset(this.snapshot, { emitEvent: false });
  }

  guardar(): void {
    if (this.form.invalid || this.saving()) return;

    const raw = this.form.getRawValue();
    const payload = {
      nombre: (raw.nombre ?? '').trim(),
      usuario: (raw.usuario ?? '').trim(),
      email: (raw.email ?? '').trim(),
      rol: String(raw.rol ?? '').trim(), // requerido por backend
    };

    this.saving.set(true);

    this.perfil
      .actualizar(this.userId(), payload)
      .pipe(finalize(() => this.saving.set(false)))
      .subscribe({
        next: (u) => {
          this.user.set(u);
          this.form.patchValue(
            {
              nombre: u.nombre ?? '',
              usuario: u.usuario ?? '',
              email: u.email ?? '',
              rol: String(u.rol ?? ''),
              activo: !!u.activo,
            },
            { emitEvent: false }
          );
          this.snapshot = this.form.getRawValue();
          this.snack.open('Perfil actualizado', 'OK', { duration: 2000 });
        },
        error: () => this.snack.open('Error al actualizar perfil', 'OK', { duration: 2600 }),
      });
  }

  // === JWT sub => UUID ===
  private getUserIdFromToken(): string {
    const token = this.auth.getToken?.() ?? '';
    if (!token) return '';
    try {
      const payload = token.split('.')[1];
      const json = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/')));
      return String(json?.sub ?? '');
    } catch {
      return '';
    }
  }
}