import { CommonModule } from '@angular/common';
import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ConfirmDeleteDialogData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
}

@Component({
  selector: 'rs-confirm-delete-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rs-delete-dialog">
      <div class="rs-delete-dialog__icon">
        <mat-icon>delete_forever</mat-icon>
      </div>

      <h2 mat-dialog-title class="rs-delete-dialog__title">
        {{ data.title }}
      </h2>

      <mat-dialog-content class="rs-delete-dialog__content">
        {{ data.message }}
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="rs-delete-dialog__actions">
        <button mat-stroked-button type="button" class="btn-cancel" (click)="close(false)">
          {{ data.cancelText || 'Cancelar' }}
        </button>

        <button mat-flat-button type="button" class="btn-delete" (click)="close(true)">
          {{ data.confirmText || 'Eliminar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .rs-delete-dialog {
      padding: 8px 6px 2px;
      min-width: 320px;
      max-width: 460px;
    }

    .rs-delete-dialog__icon {
      width: 54px;
      height: 54px;
      border-radius: 16px;
      display: grid;
      place-items: center;
      margin: 0 auto 12px;
      background: rgba(239, 68, 68, 0.08);
      border: 1px solid rgba(239, 68, 68, 0.16);
    }

    .rs-delete-dialog__icon mat-icon {
      color: #dc2626;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }

    .rs-delete-dialog__title {
      margin: 0;
      text-align: center;
      font-size: 20px;
      font-weight: 800;
      color: #0f172a;
      letter-spacing: -0.02em;
    }

    .rs-delete-dialog__content {
      margin-top: 8px;
      text-align: center;
      color: #475569;
      font-size: 14px;
      line-height: 1.55;
      padding: 0 6px 8px !important;
    }

    .rs-delete-dialog__actions {
      display: flex;
      gap: 10px;
      padding: 8px 0 0 !important;
    }

    .btn-cancel {
      border-radius: 12px !important;
      font-weight: 700 !important;
      padding: 0 16px !important;
      height: 40px !important;
    }

    .btn-delete {
      border-radius: 12px !important;
      background: #dc2626 !important;
      color: #fff !important;
      font-weight: 800 !important;
      padding: 0 18px !important;
      height: 40px !important;
      box-shadow: 0 10px 22px rgba(220, 38, 38, 0.18) !important;
    }
  `]
})
export class ConfirmDeleteDialogComponent {
  constructor(
    private dialogRef: MatDialogRef<ConfirmDeleteDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ConfirmDeleteDialogData
  ) {}

  close(value: boolean): void {
    this.dialogRef.close(value);
  }
}