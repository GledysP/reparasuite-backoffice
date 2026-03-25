import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import {
  AbstractControl,
  FormBuilder,
  ReactiveFormsModule,
  ValidationErrors,
  ValidatorFn,
  Validators
} from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { ClienteGuardarRequest } from '../clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';

export interface ClienteFormDialogData {
  modo: 'crear' | 'editar';
  cliente?: ClienteResumen | null;
}

function optionalEmailValidator(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = (control.value ?? '').toString().trim();
    if (!value) return null;
    return Validators.email(control);
  };
}

@Component({
  selector: 'rs-cliente-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './cliente-form-dialog.component.html',
  styleUrls: ['./cliente-form-dialog.component.scss']
})
export class ClienteFormDialogComponent {
  loading = false;

  form;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<ClienteFormDialogComponent, ClienteGuardarRequest | undefined>,
    @Inject(MAT_DIALOG_DATA) public data: ClienteFormDialogData
  ) {
    this.form = this.fb.group({
      nombre: [
        data?.cliente?.nombre ?? '',
        [Validators.required, Validators.minLength(2), Validators.maxLength(255)]
      ],
      telefono: [
        data?.cliente?.telefono ?? '',
        [Validators.maxLength(255)]
      ],
      email: [
        data?.cliente?.email ?? '',
        [Validators.maxLength(255), optionalEmailValidator()]
      ]
    });
  }

  get esEdicion(): boolean {
    return this.data.modo === 'editar';
  }

  get titulo(): string {
    return this.esEdicion ? 'Editar cliente' : 'Nuevo cliente';
  }

  get textoBoton(): string {
    return this.esEdicion ? 'Guardar cambios' : 'Crear cliente';
  }

  cancelar(): void {
    if (this.loading) return;
    this.dialogRef.close();
  }

  cerrar(): void {
    this.cancelar();
  }

  guardar(): void {
    if (this.loading) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const raw = this.form.getRawValue();

    const nombre = (raw.nombre ?? '').toString().trim();
    const telefono = (raw.telefono ?? '').toString().trim();
    const email = (raw.email ?? '').toString().trim();

    const payload: ClienteGuardarRequest = {
      nombre,
      telefono: telefono ? telefono : null,
      email: email ? email : null
    };

    this.dialogRef.close(payload);
  }
}