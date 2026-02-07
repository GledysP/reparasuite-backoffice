import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { NgFor, NgIf } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatDividerModule } from '@angular/material/divider';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { PrioridadOt, TipoOt } from '../../../core/models/enums';
import { UsuarioResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-nueva',
  standalone: true,
  imports: [
    NgIf, NgFor,
    ReactiveFormsModule,
    MatCardModule, MatFormFieldModule, MatInputModule,
    MatRadioModule, MatSelectModule, MatButtonModule, MatDividerModule,
    MatSnackBarModule
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

  tecnicos: UsuarioResumen[] = [];
  prioridades: PrioridadOt[] = ['BAJA','MEDIA','ALTA'];

  form = this.fb.group({
    clienteNombre: ['', [Validators.required]],
    clienteTelefono: [''],
    clienteEmail: [''],

    tipo: ['TIENDA' as TipoOt, [Validators.required]],
    direccion: [''],
    notasAcceso: [''],
    fechaPrevista: [''],

    descripcion: ['', [Validators.required]],
    prioridad: ['MEDIA' as PrioridadOt, [Validators.required]],
    tecnicoId: [''],
  });

  ngOnInit(): void {
    this.usuarios.listar(true).subscribe(u => this.tecnicos = u.filter(x => x.rol === 'TECNICO'));
  }

  cancelar() {
    this.router.navigateByUrl('/ordenes-trabajo');
  }

  crear() {
    if (this.form.invalid) {
      this.snack.open('Revisa los campos obligatorios', 'OK', { duration: 2500 });
      return;
    }

    const v = this.form.getRawValue();

    const body = {
      cliente: {
        id: null,
        nombre: v.clienteNombre,
        telefono: v.clienteTelefono || null,
        email: v.clienteEmail || null,
      },
      tipo: v.tipo,
      prioridad: v.prioridad,
      descripcion: v.descripcion,
      tecnicoId: v.tecnicoId || null,

      fechaPrevista: v.tipo === 'DOMICILIO' ? (v.fechaPrevista || null) : null,
      direccion: v.tipo === 'DOMICILIO' ? (v.direccion || null) : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? (v.notasAcceso || null) : null,
    };

    this.ordenes.crear(body).subscribe({
      next: (res) => this.router.navigate(['/ordenes-trabajo', res.id]),
      error: () => this.snack.open('Error creando la OT', 'OK', { duration: 2500 }),
    });
  }
}
