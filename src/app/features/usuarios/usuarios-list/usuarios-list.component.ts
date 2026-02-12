import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass, CommonModule } from '@angular/common';
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
import { ConfirmDialogComponent } from '../confirm-dialog/confirm-dialog.component'; // Añadido

@Component({
  selector: 'rs-usuarios-list',
  standalone: true,
  imports: [
    CommonModule, NgIf, NgClass, MatCardModule, MatTableModule, MatIconModule, 
    MatButtonModule, MatSlideToggleModule, MatDialogModule, MatSnackBarModule,
    ConfirmDialogComponent // Añadido
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  displayedColumns = ['nombre', 'email', 'rol', 'activo', 'acciones'];
  items: any[] = [];

  constructor(
    private usuariosService: UsuariosService, 
    private dialog: MatDialog,
    private snackBar: MatSnackBar
  ) {}

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

  cargarUsuarios(): void {
    this.usuariosService.listar().subscribe({
      next: (res) => {
        this.items = res.map((u: any) => ({
          ...u,
          email: u.email || `${u.nombre.toLowerCase().replace(/\s+/g, '.')}@workshop.com`
        }));
      },
      error: (err) => {
        console.error('Error al cargar:', err);
        this.notificar('❌ No se pudieron cargar los usuarios');
      }
    });
  }

  crearUsuario(): void {
    const dialogRef = this.dialog.open(UsuarioFormDialogComponent, { 
      width: '450px', 
      autoFocus: false 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.usuariosService.crear(result).subscribe({
          next: () => {
            this.cargarUsuarios();
            this.notificar('✅ Usuario creado exitosamente');
          },
          error: (err) => {
            console.error('Error:', err);
            this.notificar('❌ Error al crear usuario');
          }
        });
      }
    });
  }

  editarUsuario(usuario: any): void {
    const dialogRef = this.dialog.open(UsuarioFormDialogComponent, { 
      width: '450px', 
      data: usuario, 
      autoFocus: false 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.usuariosService.actualizar(usuario.id, result).subscribe({
          next: () => {
            this.cargarUsuarios();
            this.notificar('🔄 Usuario actualizado correctamente');
          },
          error: (err) => {
            console.error('Error:', err);
            this.notificar('❌ Error al actualizar');
          }
        });
      }
    });
  }

  toggleEstado(usuario: any): void {
    const nuevoEstado = !usuario.activo;

    this.usuariosService.cambiarEstado(usuario.id, nuevoEstado).subscribe({
      next: () => {
        usuario.activo = nuevoEstado; // Actualiza el estado localmente
        this.notificar(`Estado de ${usuario.nombre} actualizado`);
       
      },
      error: (err) => {
        console.error('Error en Toggle:', err);
        this.cargarUsuarios(); 
        this.notificar('❌ El servidor rechazó el cambio de estado');
      }
    });
  }

  borrarUsuario(usuario: any): void {
    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: { nombre: usuario.nombre }
    });

    dialogRef.afterClosed().subscribe(confirmado => {
      if (confirmado) {
        this.usuariosService.eliminar(usuario.id).subscribe({
          next: () => {
            this.cargarUsuarios();
            this.notificar('🗑️ Usuario eliminado permanentemente');
          },
          error: (err) => {
            console.error('Error en borrado:', err);
            this.notificar('❌ Error: El backend no permitió eliminar el registro');
          }
        });
      }
    });
  }

  verUsuario(usuario: any): void {
    this.dialog.open(UsuarioDetalleDialogComponent, { 
      width: '400px', 
      data: usuario 
    });
  }
}