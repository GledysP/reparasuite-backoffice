import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UsuariosService } from '../usuarios.service';
import { UsuarioFormDialogComponent } from '../usuario-form-dialog/usuario-form-dialog.component';
import { UsuarioDetalleDialogComponent } from '../usuario-detalle-dialog/usuario-detalle-dialog.component';
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component';

type AvatarTone = 'neon' | 'ice' | 'slate' | 'navy';

interface UsuarioItem {
  id: string | number;
  nombre: string;
  usuario?: string;
  email: string;
  rol: string;
  activo: boolean;
  [key: string]: unknown;
}

@Component({
  selector: 'rs-usuarios-list',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    MatSlideToggleModule,
    MatDialogModule,
    MatSnackBarModule
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsuariosListComponent implements OnInit {
  private readonly usuariosService = inject(UsuariosService);
  private readonly dialog = inject(MatDialog);
  private readonly snackBar = inject(MatSnackBar);
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);

  displayedColumns = ['nombre', 'email', 'rol', 'activo', 'acciones'];
  items: UsuarioItem[] = [];

  saving = false;
  deletingId: string | number | null = null;

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  private notificar(mensaje: string): void {
    this.snackBar.open(mensaje, 'Cerrar', {
      duration: 3000,
      horizontalPosition: 'right',
      verticalPosition: 'bottom'
    });
  }

  private getUsuarioId(id: string | number | null | undefined): string {
    return String(id ?? '');
  }

  private normalizarUsuario(u: any): UsuarioItem {
    const nombre = String(u?.nombre ?? '').trim();
    const usuario = String(u?.usuario ?? '').trim();

    return {
      ...u,
      id: u?.id,
      nombre,
      usuario,
      email:
        u?.email ||
        `${(usuario || nombre || 'usuario')
          .toLowerCase()
          .trim()
          .replace(/\s+/g, '.')}@workshop.com`,
      rol: String(u?.rol ?? ''),
      activo: !!u?.activo
    };
  }

  /**
   * El backend exige:
   * - nombre
   * - usuario
   * - email
   * - rol
   * - password (solo en crear)
   *
   * Como el formulario actual no tiene un campo separado "usuario",
   * usamos el mismo valor de nombre para cumplir el contrato.
   * En edición, si el usuario ya existe en el row, preservamos ese username.
   */
  private toCreatePayload(formValue: any): any {
    const nombre = String(formValue?.nombre ?? '').trim();

    return {
      nombre,
      usuario: nombre,
      email: String(formValue?.email ?? '').trim(),
      rol: String(formValue?.rol ?? '').trim(),
      password: String(formValue?.password ?? '').trim()
    };
  }

  private toUpdatePayload(formValue: any, original: UsuarioItem): any {
    const nombre = String(formValue?.nombre ?? '').trim();

    return {
      nombre,
      usuario: String(original?.usuario ?? nombre).trim(),
      email: String(formValue?.email ?? '').trim(),
      rol: String(formValue?.rol ?? '').trim()
    };
  }

  cargarUsuarios(): void {
    this.usuariosService
      .listar()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res: any[]) => {
          this.items = (res ?? []).map((u: any) => this.normalizarUsuario(u));
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error al cargar usuarios:', err);
          this.items = [];
          this.notificar('❌ No se pudieron cargar los usuarios');
          this.cdr.markForCheck();
        }
      });
  }

  trackById(_: number, row: UsuarioItem): string | number {
    return row.id;
  }

  eliminando(row: UsuarioItem): boolean {
    return this.deletingId === row.id;
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

  getAvatarTone(name: string | null | undefined): AvatarTone {
    const value = (name ?? '').trim();
    if (!value) return 'slate';

    const hash = Array.from(value).reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const tones: AvatarTone[] = ['neon', 'ice', 'slate', 'navy'];

    return tones[hash % tones.length];
  }

  getRoleClass(rol: string | null | undefined): string {
    return (rol ?? '')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/\s+/g, '-');
  }

  crearUsuario(): void {
    if (this.saving) return;

    const dialogRef = this.dialog.open(UsuarioFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'rs-premium-dialog',
      data: null
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;

        const payload = this.toCreatePayload(result);

        this.saving = true;
        this.cdr.markForCheck();

        this.usuariosService
          .crear(payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving = false;
              this.cargarUsuarios();
              this.notificar('✅ Usuario creado exitosamente');
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Error al crear usuario:', err);
              this.saving = false;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                '❌ Error al crear usuario';

              this.notificar(msg);
              this.cdr.markForCheck();
            }
          });
      });
  }

  editarUsuario(usuario: UsuarioItem): void {
    if (!usuario?.id || this.saving) return;

    const dialogRef = this.dialog.open(UsuarioFormDialogComponent, {
      width: '640px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'rs-premium-dialog',
      data: {
        ...usuario,
        nombre: usuario.nombre,
        email: usuario.email,
        rol: usuario.rol
      }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((result) => {
        if (!result) return;

        const payload = this.toUpdatePayload(result, usuario);

        this.saving = true;
        this.cdr.markForCheck();

        this.usuariosService
          .actualizar(this.getUsuarioId(usuario.id), payload)
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.saving = false;
              this.cargarUsuarios();
              this.notificar('🔄 Usuario actualizado correctamente');
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Error al actualizar usuario:', err);
              this.saving = false;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                '❌ Error al actualizar';

              this.notificar(msg);
              this.cdr.markForCheck();
            }
          });
      });
  }

  toggleEstado(usuario: UsuarioItem): void {
    if (!usuario?.id || this.eliminando(usuario)) return;

    const estadoAnterior = usuario.activo;
    const nuevoEstado = !estadoAnterior;

    usuario.activo = nuevoEstado;
    this.cdr.markForCheck();

    this.usuariosService
      .cambiarEstado(this.getUsuarioId(usuario.id), nuevoEstado)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.notificar(`Estado de ${usuario.nombre} actualizado`);
          this.cdr.markForCheck();
        },
        error: (err) => {
          console.error('Error en toggle de estado:', err);
          usuario.activo = estadoAnterior;
          this.notificar('❌ El servidor rechazó el cambio de estado');
          this.cdr.markForCheck();
        }
      });
  }

  borrarUsuario(usuario: UsuarioItem): void {
    if (!usuario?.id || this.deletingId) return;

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '460px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'rs-premium-dialog',
      data: { nombre: usuario.nombre }
    });

    dialogRef
      .afterClosed()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((confirmado) => {
        if (!confirmado) return;

        this.deletingId = usuario.id;
        this.cdr.markForCheck();

        this.usuariosService
          .eliminar(this.getUsuarioId(usuario.id))
          .pipe(takeUntilDestroyed(this.destroyRef))
          .subscribe({
            next: () => {
              this.items = this.items.filter((item) => item.id !== usuario.id);
              this.deletingId = null;
              this.notificar('🗑️ Usuario eliminado permanentemente');
              this.cdr.markForCheck();
            },
            error: (err) => {
              console.error('Error en borrado:', err);
              this.deletingId = null;

              const msg =
                err?.error?.message ||
                err?.error?.error ||
                '❌ Error: El backend no permitió eliminar el registro';

              this.notificar(msg);
              this.cdr.markForCheck();
            }
          });
      });
  }

  verUsuario(usuario: UsuarioItem): void {
    this.dialog.open(UsuarioDetalleDialogComponent, {
      width: '520px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      panelClass: 'rs-premium-dialog',
      data: {
        ...usuario,
        nombre: usuario.nombre,
        usuario: usuario.usuario,
        email: usuario.email,
        rol: usuario.rol,
        activo: usuario.activo
      }
    });
  }
}