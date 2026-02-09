import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';

@Component({
  selector: 'rs-usuario-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatInputModule,
    MatSelectModule,
    MatOptionModule
  ],
  templateUrl: './usuario-form-dialog.component.html',
  styleUrl: './usuario-form-dialog.component.scss'
})
export class UsuarioFormDialogComponent {
  form: FormGroup;

  constructor(
    private fb: FormBuilder,
    private dialogRef: MatDialogRef<UsuarioFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {
    this.form = this.fb.group({
      nombre: [data?.nombre || '', Validators.required],
      email: [data?.email || '', [Validators.required, Validators.email]],
      rol: [data?.rol || '', Validators.required],
      password: ['', data ? [] : [Validators.required]]
    });
  }

  cancelar(): void {
    this.dialogRef.close();
  }

  guardar(): void {
    if (this.form.valid) {
      this.dialogRef.close(this.form.value);
    }
  }
}