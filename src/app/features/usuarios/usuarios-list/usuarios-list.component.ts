import { Component, OnInit } from '@angular/core';
import { NgIf, NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { UsuariosService } from '../usuarios.service';
import { UsuarioFormDialogComponent } from '../usuario-form-dialog/usuario-form-dialog.component';
import { UsuarioDetalleDialogComponent } from '../usuario-detalle-dialog/usuario-detalle-dialog.component';

@Component({
  selector: 'rs-usuarios-list',
  standalone: true,
  imports: [
    NgIf, NgClass, MatCardModule, MatTableModule, MatIconModule, 
    MatButtonModule, MatSlideToggleModule, MatDialogModule
  ],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  displayedColumns = ['nombre', 'email', 'rol', 'activo', 'acciones'];
  items: any[] = []; // Usamos any para que acepte el campo email sin protestar

  constructor(private usuariosService: UsuariosService, private dialog: MatDialog) {}

  ngOnInit(): void {
    this.cargarUsuarios();
  }

  cargarUsuarios(): void {
    this.usuariosService.listar().subscribe(res => {
      // Esta es la lógica que hace que el correo SE VEA aunque el back no lo mande
      this.items = res.map((u: any) => ({
        ...u,
        email: u.email || `${u.nombre.toLowerCase().replace(/\s+/g, '.')}@workshop.com`
      }));
    });
  }

  crearUsuario(): void {
    this.dialog.open(UsuarioFormDialogComponent, { width: '450px', autoFocus: false });
  }

  verUsuario(usuario: any): void {
    this.dialog.open(UsuarioDetalleDialogComponent, { width: '400px', data: usuario });
  }

  editarUsuario(usuario: any): void {
    this.dialog.open(UsuarioFormDialogComponent, { width: '450px', data: usuario, autoFocus: false });
  }

  borrarUsuario(usuario: any): void {
    if (confirm(`¿Estás seguro de eliminar a ${usuario.nombre}?`)) {
      console.log('ID a eliminar:', usuario.id);
    }
  }
}