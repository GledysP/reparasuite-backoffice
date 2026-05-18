import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { AjustesService } from '../ajustes.service';
import { AjustesTaller } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ajustes-taller',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule
  ],
  templateUrl: './ajustes-taller.component.html',
  styleUrl: './ajustes-taller.component.scss'
})
export class AjustesTallerComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ajustesService = inject(AjustesService);
  private snack = inject(MatSnackBar);

  cargando = false;
  // Guardamos el prefijo actual para no perderlo al enviar el DTO completo
  private currentPrefijo = 'OT-';

form = this.fb.group({
  nombre: ['', [Validators.required]],
  rif: [''], 
  telefono: [''],
  email: ['', [Validators.email]],
  direccion: ['']
});

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.ajustesService.obtenerTaller().subscribe({
      next: (t: AjustesTaller) => {
        this.currentPrefijo = t.prefijoOt || 'OT-';
        this.form.patchValue({
          nombre: t.nombre,
          telefono: t.telefono,
          email: t.email,
          direccion: t.direccion
        });
      },
      error: () => this.snack.open('Error al cargar datos del taller.', 'OK', { duration: 3000 })
    });
  }

  guardar() {
    if (this.form.invalid) return;

    this.cargando = true;
    const v = this.form.getRawValue();

    // Construimos el objeto respetando la interfaz AjustesTaller
    const payload: AjustesTaller = {
      nombre: v.nombre!,
      rif: v.rif || null, // Aseguramos que rif sea null si está vacío
      telefono: v.telefono || null,
      email: v.email || null,
      direccion: v.direccion || null,
      prefijoOt: this.currentPrefijo // Enviamos el prefijo que ya existía
    };

    this.ajustesService.guardarTaller(payload).subscribe({
      next: () => {
        this.cargando = false;
        this.snack.open('Información del taller actualizada.', 'OK', { 
          duration: 2000,
          panelClass: 'rs-toast-success' 
        });
      },
      error: (err) => {
        this.cargando = false;
        this.snack.open(err.error?.message || 'Error al guardar cambios.', 'OK', { 
          duration: 3000,
          panelClass: 'rs-toast-error' 
        });
      }
    });
  }
}