import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'rs-imagen-modal',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule],
  template: `
    <div class="rs-img-modal-container">
      <button mat-icon-button class="rs-img-close-btn" (click)="cerrar()" aria-label="Cerrar imagen">
        <mat-icon>close</mat-icon>
      </button>
      <img [src]="data.url" alt="Evidencia visual" class="rs-img-full" />
    </div>
  `,
  styles: [`
    .rs-img-modal-container {
      position: relative;
      background: #0f1523; /* Fondo oscuro para resaltar la foto */
      display: flex;
      justify-content: center;
      align-items: center;
      overflow: hidden;
      border-radius: 8px;
    }
    .rs-img-close-btn {
      position: absolute;
      top: 12px;
      right: 12px;
      color: #ffffff;
      background: rgba(0, 0, 0, 0.5);
      z-index: 10;
      transition: background 0.2s ease;
    }
    .rs-img-close-btn:hover {
      background: rgba(239, 68, 68, 0.9); /* Rojo error al pasar el mouse */
    }
    .rs-img-full {
      max-width: 100vw;
      max-height: 90vh;
      object-fit: contain; /* Mantiene la proporción sin deformar */
      display: block;
    }
  `]
})
export class ImagenModalComponent {
  constructor(
    @Inject(MAT_DIALOG_DATA) public data: { url: string },
    private dialogRef: MatDialogRef<ImagenModalComponent>
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}