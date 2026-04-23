import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { finalize } from 'rxjs';

import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';

import { InventarioService } from '../inventario.service';

type TipoMovimiento =
  | 'ENTRADA'
  | 'SALIDA'
  | 'AJUSTE_POSITIVO'
  | 'AJUSTE_NEGATIVO';

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
    <div class="rs-movement-dialog">
      <div class="rs-movement-dialog__header">
        <h2 class="rs-movement-dialog__title">Registrar movimiento</h2>
        <p class="rs-movement-dialog__subtitle">
          Actualiza el inventario con una entrada, salida o ajuste.
        </p>
      </div>

      <form class="rs-movement-dialog__form" [formGroup]="form" (ngSubmit)="guardar()">
        @if (errorMessage) {
          <div class="rs-dialog-alert">
            {{ errorMessage }}
          </div>
        }

        <div class="rs-movement-form">
          <mat-form-field appearance="outline">
            <mat-label>Tipo de movimiento</mat-label>
            <mat-select formControlName="tipoMovimiento">
              <mat-option value="ENTRADA">Entrada</mat-option>
              <mat-option value="SALIDA">Salida</mat-option>
              <mat-option value="AJUSTE_POSITIVO">Ajuste positivo</mat-option>
              <mat-option value="AJUSTE_NEGATIVO">Ajuste negativo</mat-option>
            </mat-select>
            @if (form.controls.tipoMovimiento.touched && form.controls.tipoMovimiento.invalid) {
              <mat-error>Selecciona un tipo de movimiento.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Cantidad</mat-label>
            <input
              matInput
              type="number"
              min="1"
              step="1"
              inputmode="numeric"
              formControlName="cantidad"
            />
            @if (form.controls.cantidad.touched && form.controls.cantidad.hasError('required')) {
              <mat-error>La cantidad es obligatoria.</mat-error>
            }
            @if (form.controls.cantidad.touched && form.controls.cantidad.hasError('min')) {
              <mat-error>La cantidad debe ser mayor o igual a 1.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Costo unitario</mat-label>
            <input
              matInput
              type="number"
              min="0"
              step="0.01"
              inputmode="decimal"
              formControlName="costoUnitario"
            />
            @if (form.controls.costoUnitario.touched && form.controls.costoUnitario.hasError('min')) {
              <mat-error>El costo no puede ser negativo.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Motivo</mat-label>
            <input
              matInput
              maxlength="120"
              formControlName="motivo"
            />
            @if (form.controls.motivo.touched && form.controls.motivo.hasError('maxlength')) {
              <mat-error>Máximo 120 caracteres.</mat-error>
            }
          </mat-form-field>

          <mat-form-field appearance="outline" class="rs-field--full">
            <mat-label>Observación</mat-label>
            <textarea
              matInput
              rows="3"
              maxlength="500"
              formControlName="observacion"
            ></textarea>
            @if (form.controls.observacion.touched && form.controls.observacion.hasError('maxlength')) {
              <mat-error>Máximo 500 caracteres.</mat-error>
            }
          </mat-form-field>
        </div>

        <div class="rs-movement-dialog__actions">
          <button
            mat-stroked-button
            type="button"
            class="rs-btn rs-btn--ghost"
            (click)="cerrar()"
            [disabled]="saving"
          >
            Cancelar
          </button>

          <button
            mat-flat-button
            type="submit"
            class="rs-btn rs-btn--primary"
            [disabled]="form.invalid || saving"
          >
            <span class="rs-btn__shimmer"></span>
            <span class="rs-btn__label">
              {{ saving ? 'Guardando...' : 'Guardar movimiento' }}
            </span>
          </button>
        </div>
      </form>
    </div>
  `,
  styles: [`
    :host {
      display: block;
      font-family: Inter, Roboto, 'Helvetica Neue', sans-serif;
      background: transparent !important;
      color: var(--rs-text-main);
    }

    @keyframes rsShimmer {
      0% {
        transform: translateX(-160%) skewX(-24deg);
      }
      100% {
        transform: translateX(220%) skewX(-24deg);
      }
    }

    .rs-movement-dialog {
      display: block;
      padding: 12px 12px 10px;
      background: var(--rs-card) !important;
      border-radius: 22px;
    }

    .rs-movement-dialog__header {
      padding: 0 6px 2px;
      margin-bottom: 8px;
    }

    .rs-movement-dialog__title {
      margin: 0;
      font-size: 1.34rem;
      line-height: 1.08;
      font-weight: 650;
      letter-spacing: -0.03em;
      color: var(--rs-text-navy);
    }

    .rs-movement-dialog__subtitle {
      margin: 8px 0 0;
      font-size: 13px;
      line-height: 1.5;
      color: var(--rs-text-muted);
    }

    .rs-movement-dialog__form {
      display: block;
      padding: 4px 4px 0;
    }

    .rs-dialog-alert {
      margin: 0 2px 12px;
      padding: 12px 14px;
      border-radius: 14px;
      border: 1px solid rgba(239, 68, 68, 0.14);
      background: rgba(239, 68, 68, 0.08);
      color: #b91c1c;
      font-size: 13px;
      line-height: 1.45;
      font-weight: 500;
    }

    .rs-movement-form {
      display: grid;
      grid-template-columns: repeat(2, minmax(0, 1fr));
      gap: 12px 14px;
      align-items: start;
    }

    .rs-field--full {
      grid-column: 1 / -1;
    }

    .rs-movement-dialog__actions {
      display: flex;
      justify-content: flex-end;
      gap: 10px;
      padding: 12px 2px 2px;
      margin-top: 8px;
    }

    .rs-btn {
      height: 44px !important;
      padding: 0 18px !important;
      border-radius: 14px !important;
      font-size: 13px !important;
      font-weight: 700 !important;
      letter-spacing: -0.01em !important;
      min-width: 0 !important;
    }

    .rs-movement-dialog__actions .rs-btn {
      min-width: 150px;
    }

    .rs-btn--ghost {
      border: 1px solid var(--rs-border) !important;
      background: var(--rs-card) !important;
      color: var(--rs-text-navy) !important;
      box-shadow: none !important;
      transition:
        transform 160ms ease,
        border-color 160ms ease,
        background 160ms ease;
    }

    .rs-btn--ghost:hover:not(:disabled) {
      transform: translateY(-1px);
      border-color: var(--rs-border) !important;
      background: rgba(0, 191, 245, 0.05) !important;
    }

    .rs-btn--primary {
      position: relative;
      overflow: hidden;
      isolation: isolate;
      color: #ffffff !important;
      background: linear-gradient(135deg, var(--rs-primary-dark) 0%, var(--rs-primary) 100%) !important;
      box-shadow:
        0 14px 30px rgba(0, 122, 255, 0.16),
        0 0 28px rgba(0, 209, 255, 0.14) !important;
      transition:
        transform 160ms ease,
        filter 160ms ease,
        box-shadow 160ms ease;
    }

    .rs-btn--primary:hover:not(:disabled) {
      filter: brightness(1.02);
      transform: translateY(-1px);
    }

    .rs-btn--primary:active:not(:disabled) {
      transform: translateY(0);
    }

    .rs-btn--primary:disabled {
      opacity: 0.72;
      box-shadow: none !important;
    }

    .rs-btn__label {
      position: relative;
      z-index: 2;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      white-space: nowrap;
    }

    .rs-btn__shimmer {
      position: absolute;
      inset: 0;
      z-index: 1;
      pointer-events: none;
    }

    .rs-btn__shimmer::before {
      content: '';
      position: absolute;
      top: -20%;
      left: -30%;
      width: 32%;
      height: 140%;
      background: linear-gradient(
        90deg,
        rgba(255, 255, 255, 0) 0%,
        rgba(255, 255, 255, 0.08) 30%,
        rgba(255, 255, 255, 0.30) 50%,
        rgba(255, 255, 255, 0.08) 70%,
        rgba(255, 255, 255, 0) 100%
      );
      animation: rsShimmer 3.6s linear infinite;
    }

    :host ::ng-deep .mat-mdc-form-field {
      width: 100%;
    }

    :host ::ng-deep .mat-mdc-form-field-subscript-wrapper {
      padding: 0 6px;
    }

    :host ::ng-deep .mdc-text-field--outlined {
      background: var(--rs-card) !important;
      border-radius: 18px !important;
    }

    :host ::ng-deep .mdc-text-field--outlined .mdc-notched-outline {
      border-radius: 18px !important;
      overflow: hidden;
    }

    :host ::ng-deep .mdc-notched-outline__leading,
    :host ::ng-deep .mdc-notched-outline__notch,
    :host ::ng-deep .mdc-notched-outline__trailing {
      border-color: var(--rs-border) !important;
    }

    :host ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field:hover .mdc-notched-outline__trailing {
      border-color: var(--rs-border) !important;
    }

    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__leading,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__notch,
    :host ::ng-deep .mat-mdc-form-field.mat-focused .mdc-notched-outline__trailing {
      border-color: var(--rs-primary) !important;
      border-width: 1.5px !important;
    }

    :host ::ng-deep .mat-mdc-text-field-wrapper {
      min-height: 46px !important;
    }

    :host ::ng-deep .mat-mdc-form-field-infix {
      min-height: 46px !important;
      padding-top: 12px !important;
      padding-bottom: 8px !important;
      padding-left: 2px !important;
      padding-right: 2px !important;
    }

    :host ::ng-deep .mat-mdc-input-element,
    :host ::ng-deep .mat-mdc-select-value {
      font-size: 14px !important;
      color: var(--rs-text-main) !important;
      font-weight: 500 !important;
      opacity: 1 !important;
      caret-color: var(--rs-primary) !important;
    }

    :host ::ng-deep .mat-mdc-select-arrow {
      color: var(--rs-text-muted);
    }

    :host ::ng-deep .mdc-floating-label {
      color: var(--rs-text-muted) !important;
      font-size: 12.5px !important;
      font-weight: 500 !important;
    }

    :host ::ng-deep .mat-mdc-form-field-error {
      font-size: 11.5px;
    }

    :host ::ng-deep textarea.mat-mdc-input-element {
      resize: vertical;
      min-height: 72px !important;
      line-height: 1.45 !important;
    }

    @media (max-width: 640px) {
      .rs-movement-dialog {
        padding: 10px 8px 8px;
      }

      .rs-movement-form {
        grid-template-columns: 1fr;
      }

      .rs-field--full {
        grid-column: auto;
      }

      .rs-movement-dialog__actions {
        flex-direction: column-reverse;
      }

      .rs-movement-dialog__actions .rs-btn {
        width: 100%;
      }
    }
  `],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventarioMovimientoDialogComponent {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<InventarioMovimientoDialogComponent>);
  private readonly service = inject(InventarioService);

  readonly data = inject<{ itemId: string }>(MAT_DIALOG_DATA);

  saving = false;
  errorMessage = '';

  readonly form = this.fb.nonNullable.group({
    tipoMovimiento: this.fb.nonNullable.control<TipoMovimiento>('ENTRADA', {
      validators: [Validators.required]
    }),
    cantidad: this.fb.nonNullable.control('1', {
      validators: [Validators.required, Validators.min(1)]
    }),
    costoUnitario: this.fb.nonNullable.control('', {
      validators: [Validators.min(0)]
    }),
    motivo: this.fb.nonNullable.control('', {
      validators: [Validators.maxLength(120)]
    }),
    observacion: this.fb.nonNullable.control('', {
      validators: [Validators.maxLength(500)]
    })
  });

  guardar(): void {
    if (this.form.invalid || this.saving) {
      this.form.markAllAsTouched();
      return;
    }

    this.errorMessage = '';
    this.saving = true;

    const payload = this.form.getRawValue();

    this.service.registrarMovimiento(this.data.itemId, {
      tipoMovimiento: payload.tipoMovimiento,
      cantidad: payload.cantidad,
      costoUnitario: payload.costoUnitario.trim() ? payload.costoUnitario : null,
      motivo: payload.motivo.trim() ? payload.motivo.trim() : null,
      observacion: payload.observacion.trim() ? payload.observacion.trim() : null
    }).pipe(
      finalize(() => {
        this.saving = false;
      })
    ).subscribe({
      next: () => this.dialogRef.close(true),
      error: () => {
        this.errorMessage = 'No se pudo registrar el movimiento. Intenta nuevamente.';
      }
    });
  }

  cerrar(): void {
    if (this.saving) return;
    this.dialogRef.close(false);
  }
}