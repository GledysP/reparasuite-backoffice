import { Component, Inject, ChangeDetectionStrategy } from '@angular/core';
import { CommonModule, NgClass } from '@angular/common';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'rs-usuario-detalle-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule, NgClass],
  templateUrl: './usuario-detalle-dialog.component.html',
  styleUrl: './usuario-detalle-dialog.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuarioDetalleDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UsuarioDetalleDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: any
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }

  getUserInitials(name: string | null | undefined): string {
    if (!name?.trim()) return 'US';

    const parts = name
      .trim()
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2);

    const initials = parts.map((part) => part.charAt(0).toUpperCase()).join('');
    return initials || 'US';
  }

  getAvatarTone(name: string | null | undefined): 'neon' | 'ice' | 'slate' | 'navy' {
    const value = (name ?? '').trim();
    if (!value) return 'slate';

    const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const tones: Array<'neon' | 'ice' | 'slate' | 'navy'> = ['neon', 'ice', 'slate', 'navy'];

    return tones[hash % tones.length];
  }

  getRoleClass(rol: string | null | undefined): string {
    return (rol ?? '').toLowerCase();
  }
}