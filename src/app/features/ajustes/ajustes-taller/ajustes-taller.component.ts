import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AjustesService } from '../ajustes.service';

@Component({
  selector: 'rs-ajustes-taller',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatButtonModule,
    MatSnackBarModule
  ],
  templateUrl: './ajustes-taller.component.html',
  styleUrl: './ajustes-taller.component.scss',
})
export class AjustesTallerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ajustes = inject(AjustesService);
  private snack = inject(MatSnackBar);

  form = this.fb.group({
    nombre: ['', [Validators.required]],
    telefono: [''],
    email: [''],
    direccion: [''],
    prefijoOt: [{ value: '', disabled: true }],
  });

  ngOnInit(): void {
    this.ajustes.obtenerTaller().subscribe({
      next: (t) => this.form.patchValue(t),
      error: () => this.snack.open('Error cargando ajustes', 'OK', { duration: 2500 }),
    });
  }

  guardar() {
    if (this.form.invalid) return;

    const v = this.form.getRawValue();
    this.ajustes.guardarTaller({
      nombre: v.nombre!,
      telefono: v.telefono || null,
      email: v.email || null,
      direccion: v.direccion || null,
    }).subscribe({
      next: () => this.snack.open('Guardado', 'OK', { duration: 2000 }),
      error: () => this.snack.open('Error guardando', 'OK', { duration: 2500 }),
    });
  }
}
