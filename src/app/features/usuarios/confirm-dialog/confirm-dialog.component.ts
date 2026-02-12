import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'rs-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  templateUrl: './confirm-dialog.component.html', // Ahora sí apunta a tu archivo creado
  styleUrl: './confirm-dialog.component.scss'
})
export class ConfirmDialogComponent {
  constructor(
    public ref: MatDialogRef<ConfirmDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { nombre: string }
  ) {}
}