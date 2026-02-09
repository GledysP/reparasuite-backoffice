import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'rs-usuario-detalle-dialog',
  standalone: true,
  imports: [
    CommonModule, 
    MatDialogModule, 
    MatButtonModule, 
    MatIconModule
  ],
  templateUrl: './usuario-detalle-dialog.component.html',
  styleUrl: './usuario-detalle-dialog.component.scss'
})
export class UsuarioDetalleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UsuarioDetalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}