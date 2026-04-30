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
      <!-- Icono bajado y centrado -->
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
        <!-- Botón secundario global -->
        <button mat-stroked-button type="button" class="rs-btn-secondary btn-layout" (click)="close(false)">
          {{ data.cancelText || 'Cancelar' }}
        </button>

        <button mat-flat-button type="button" class="btn-delete" (click)="close(true)">
          {{ data.confirmText || 'Sí, eliminar' }}
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .rs-delete-dialog {
      padding: 32px 24px 16px !important; /* Más aire arriba para que el logo baje */
      min-width: 350px;
      max-width: 420px;
    }

    .rs-delete-dialog__icon {
      width: 48px; 
      height: 48px; 
      border-radius: 50%;
      display: grid; 
      place-items: center; 
      /* Bajamos el logo dándole margen arriba y pegándolo al título abajo */
      margin: 0 auto 12px; 
      background: rgba(239, 68, 68, 0.1); 
      border: 1px solid rgba(239, 68, 68, 0.2);
    }
    
    .rs-delete-dialog__icon mat-icon { 
      color: #ef4444; 
      font-size: 24px; 
      width: 24px; 
      height: 24px; 
    }
    
    .rs-delete-dialog__title {
      margin: 0 0 12px 0 !important; 
      padding: 0 !important;
      text-align: center; 
      font-size: 1.2rem; 
      font-weight: 800; 
      color: var(--rs-text-navy); 
    }
    
    .rs-delete-dialog__content {
      margin: 0; 
      text-align: center; 
      font-size: 0.95rem; 
      line-height: 1.5;
      color: var(--rs-text-muted); 
      padding: 0 10px 24px !important;
    }
    
    .rs-delete-dialog__actions { 
      display: flex; 
      justify-content: flex-end; 
      gap: 12px; 
      padding: 0 !important; 
    }
    
    .btn-layout {
      border-radius: 12px !important; 
      padding: 0 20px !important; 
      height: 42px !important;
      min-width: 100px;
    }

    .btn-delete {
      border-radius: 12px !important; 
      color: #fff !important; 
      font-weight: 800; 
      padding: 0 24px !important; 
      height: 42px !important;
      background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%) !important;
      box-shadow: 0 6px 16px rgba(220, 38, 38, 0.25) !important;
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