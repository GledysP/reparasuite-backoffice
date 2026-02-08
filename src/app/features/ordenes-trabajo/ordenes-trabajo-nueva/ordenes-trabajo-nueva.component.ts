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
  prioridades: PrioridadOt[] = ['BAJA', 'MEDIA', 'ALTA'];

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
    tecnicoId: [null as string | null],
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

    // Formateo de fecha para OffsetDateTime (ISO 8601 completo)
    let fechaIso = null;
    if (v.fechaPrevista) {
      const d = new Date(v.fechaPrevista);
      if (!isNaN(d.getTime())) {
        fechaIso = d.toISOString(); 
      }
    }

    // Usamos (v.campo || '') para asegurar a TS que no es null
    const body = {
      cliente: {
        nombre: (v.clienteNombre || '').trim(),
        telefono: v.clienteTelefono?.trim() || null,
        email: v.clienteEmail?.trim() || null,
      },
      tipo: v.tipo,
      prioridad: v.prioridad,
      descripcion: (v.descripcion || '').trim(),
      tecnicoId: v.tecnicoId && v.tecnicoId !== '' ? v.tecnicoId : null,

      fechaPrevista: v.tipo === 'DOMICILIO' ? fechaIso : null,
      direccion: v.tipo === 'DOMICILIO' ? (v.direccion?.trim() || null) : null,
      notasAcceso: v.tipo === 'DOMICILIO' ? (v.notasAcceso?.trim() || null) : null,
    };

    console.log('Payload enviado con éxito:', body);

    this.ordenes.crear(body).subscribe({
      next: (res) => {
        this.snack.open('¡Orden creada con éxito!', 'Cerrar', { duration: 3000 });
        this.router.navigate(['/ordenes-trabajo', res.id]);
      },
      error: (err) => {
        console.error('Error detallado:', err);
        const msg = err.error?.message || 'Error en el servidor';
        this.snack.open(msg, 'OK', { duration: 5000 });
      },
    });
  }
}