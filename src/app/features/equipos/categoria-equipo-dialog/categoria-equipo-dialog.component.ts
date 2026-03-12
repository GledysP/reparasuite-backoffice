import { Component, Inject, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

import { CategoriaEquipoDto } from '../../../core/models/tipos';
import { EquiposService } from '../equipos.service';

type DialogData = {
  categoria: CategoriaEquipoDto | null;
};

@Component({
  selector: 'rs-categoria-equipo-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatCheckboxModule,
    MatFormFieldModule,
    MatInputModule
  ],
  templateUrl: './categoria-equipo-dialog.component.html',
  styleUrl: './categoria-equipo-dialog.component.scss'
})
export class CategoriaEquipoDialogComponent {
  private fb = inject(FormBuilder);
  private service = inject(EquiposService);
  private dialogRef = inject(MatDialogRef<CategoriaEquipoDialogComponent>);

  saving = false;

  form = this.fb.group({
    codigo: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(50)]),
    nombre: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
    descripcion: this.fb.nonNullable.control(''),
    icono: this.fb.nonNullable.control(''),
    ordenVisual: this.fb.nonNullable.control(0),
    activa: this.fb.nonNullable.control(true)
  });

  constructor(@Inject(MAT_DIALOG_DATA) public data: DialogData) {
    const categoria = data.categoria;
    if (categoria) {
      this.form.patchValue({
        codigo: categoria.codigo ?? '',
        nombre: categoria.nombre ?? '',
        descripcion: categoria.descripcion ?? '',
        icono: categoria.icono ?? '',
        ordenVisual: 0,
        activa: true
      });
    }
  }

  guardar(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.saving = true;
    const raw = this.form.getRawValue();

    const body = {
      codigo: raw.codigo.trim().toUpperCase(),
      nombre: raw.nombre.trim(),
      descripcion: raw.descripcion.trim() || null,
      icono: raw.icono.trim() || null,
      ordenVisual: Number(raw.ordenVisual ?? 0),
      activa: !!raw.activa
    };

    const obs = this.data.categoria?.id
      ? this.service.actualizarCategoria(this.data.categoria.id, body)
      : this.service.crearCategoria(body);

    obs.subscribe({
      next: (res) => this.dialogRef.close(res),
      error: () => {
        this.saving = false;
      }
    });
  }

  cerrar(): void {
    if (this.saving) return;
    this.dialogRef.close();
  }
}