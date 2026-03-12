import { Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { InventarioService } from '../inventario.service';

@Component({
  selector: 'rs-inventario-movimiento-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule
  ],
  template: `
    <h2 mat-dialog-title>Registrar movimiento</h2>

    <div mat-dialog-content>
      <form [formGroup]="form" class="rs-form-grid">
        <mat-form-field appearance="outline">
          <mat-label>Tipo movimiento</mat-label>
          <mat-select formControlName="tipoMovimiento">
            <mat-option value="ENTRADA">ENTRADA</mat-option>
            <mat-option value="SALIDA">SALIDA</mat-option>
            <mat-option value="AJUSTE_POSITIVO">AJUSTE_POSITIVO</mat-option>
            <mat-option value="AJUSTE_NEGATIVO">AJUSTE_NEGATIVO</mat-option>
          </mat-select>
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Cantidad</mat-label>
          <input matInput formControlName="cantidad" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Costo unitario</mat-label>
          <input matInput formControlName="costoUnitario" />
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Motivo</mat-label>
          <input matInput formControlName="motivo" />
        </mat-form-field>

        <mat-form-field appearance="outline" class="span-2">
          <mat-label>Observación</mat-label>
          <textarea matInput rows="3" formControlName="observacion"></textarea>
        </mat-form-field>
      </form>
    </div>

    <div mat-dialog-actions align="end">
      <button mat-stroked-button (click)="cerrar()">Cancelar</button>
      <button mat-flat-button color="primary" (click)="guardar()" [disabled]="form.invalid">Guardar</button>
    </div>
  `,
  styles: [`
    .rs-form-grid { display:grid; grid-template-columns:repeat(2,minmax(0,1fr)); gap:16px; padding-top:6px; }
    .span-2 { grid-column:span 2; }
    @media (max-width: 768px) {
      .rs-form-grid { grid-template-columns:1fr; }
      .span-2 { grid-column:auto; }
    }
  `]
})
export class InventarioMovimientoDialogComponent {
  private fb = inject(FormBuilder);
  private dialogRef = inject(MatDialogRef<InventarioMovimientoDialogComponent>);
  private service = inject(InventarioService);
  data = inject<{ itemId: string }>(MAT_DIALOG_DATA);

  form = this.fb.group({
    tipoMovimiento: ['ENTRADA', Validators.required],
    cantidad: ['1', Validators.required],
    costoUnitario: [''],
    motivo: [''],
    observacion: ['']
  });

  guardar(): void {
    if (this.form.invalid) return;

    const body = this.form.getRawValue();
    this.service.registrarMovimiento(this.data.itemId, {
      tipoMovimiento: body.tipoMovimiento!,
      cantidad: body.cantidad!,
      costoUnitario: body.costoUnitario || null,
      motivo: body.motivo || null,
      observacion: body.observacion || null
    }).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => this.dialogRef.close(false)
    });
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}