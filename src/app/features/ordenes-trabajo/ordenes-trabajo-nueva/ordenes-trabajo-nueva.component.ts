import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common'; // Eliminado TitleCasePipe

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatIconModule } from '@angular/material/icon';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';

import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import { UsuarioResumen, ClienteResumen } from '../../../core/models/tipos';


import { ClienteBuscarDialogComponent } from './cliente-buscar-dialog.component';

@Component({
  selector: 'rs-ordenes-trabajo-nueva',
  standalone: true,
  imports: [
    NgIf, NgFor, ReactiveFormsModule, 
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatRadioModule, MatSelectModule, MatButtonModule, MatDividerModule,
    MatSnackBarModule, MatIconModule, MatDialogModule, MatDatepickerModule, MatNativeDateModule
  ],
  templateUrl: './ordenes-trabajo-nueva.component.html',
  styleUrl: './ordenes-trabajo-nueva.component.scss',
})
export class OrdenesTrabajoNuevaComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuarios = inject(UsuariosService);
  private ordenes = inject(OrdenesTrabajoService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);

  tecnicos: UsuarioResumen[] = [];
  prioridades: PrioridadOt[] = ['BAJA', 'MEDIA', 'ALTA'];
  clienteId: string | null = null; 

  fotos: File[] = []; 

  form = this.fb.group({
    clienteNombre: ['', [Validators.required]],
    clienteTelefono: [''],
    clienteEmail: [''],

    tipo: ['TIENDA' as TipoOt, [Validators.required]],
    direccion: [''],
    notasAcceso: [''],
    fechaPrevista: [null as Date | null],

    descripcion: ['', [Validators.required]],
    prioridad: ['MEDIA' as PrioridadOt, [Validators.required]],
    tecnicoId: [null as string | null],
  });

  ngOnInit(): void {
    this.usuarios.listar(true).subscribe(u => {
      this.tecnicos = u.filter(x => x.rol === 'TECNICO');
    });
  }

  get selectedFileName(): string | null {
    if (this.fotos.length === 0) return null;
    return this.fotos.length === 1 
      ? this.fotos[0].name 
      : `${this.fotos.length} archivos seleccionados`;
  }

  onFileSelected(event: any) {
    const files: FileList = event.target.files;
    if (files.length > 0) {
      this.fotos = Array.from(files);
      this.snack.open(`${this.fotos.length} archivo(s) listo(s)`, 'OK', { duration: 2000 });
    }
  }

  buscarCliente() {
    const dialogRef = this.dialog.open(ClienteBuscarDialogComponent, {
      width: '500px',
      panelClass: 'rs-dialog-custom'
    });

    dialogRef.afterClosed().subscribe((cliente: ClienteResumen) => {
      if (cliente) {
        this.clienteId = cliente.id; 
        this.form.patchValue({
          clienteNombre: cliente.nombre,
          clienteTelefono: cliente.telefono,
          clienteEmail: cliente.email
        });
      }
    });
  }

  crear() {
    if (this.form.invalid) {
      this.snack.open('Por favor revisa los campos requeridos', 'OK', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();
    
    const body = {
      cliente: {
        id: this.clienteId, 
        nombre: v.clienteNombre?.trim(),
        telefono: v.clienteTelefono?.trim() || null,
        email: v.clienteEmail?.trim() || null,
      },
      tipo: v.tipo,
      prioridad: v.prioridad,
      descripcion: v.descripcion?.trim(),
      tecnicoId: v.tecnicoId || null,
      fechaPrevista: v.fechaPrevista ? v.fechaPrevista.toISOString() : null,
      direccion: v.tipo === 'DOMICILIO' ? v.direccion : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? v.notasAcceso : null,
    };

    this.ordenes.crear(body).subscribe({
      next: (res) => {
        this.snack.open('¡Orden creada con éxito!', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/ordenes-trabajo', res.id]);
      },
      error: (err) => {
        this.snack.open(err.error?.message || 'Error al crear la orden', 'OK');
      }
    });
  }

  cancelar() {
    this.router.navigateByUrl('/ordenes-trabajo');
  }
}