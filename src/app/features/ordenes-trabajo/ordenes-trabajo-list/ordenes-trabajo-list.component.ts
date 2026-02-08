import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';

import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { EstadoOt, TipoOt } from '../../../core/models/enums';
import { OtListaItem, UsuarioResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-list',
  standalone: true,
  imports: [
    DatePipe,
    RouterLink,
    ReactiveFormsModule,
    MatCardModule, 
    MatFormFieldModule, 
    MatSelectModule, 
    MatInputModule,
    MatButtonModule, 
    MatTableModule, 
    MatPaginatorModule, 
    MatIconModule,
  ],
  templateUrl: './ordenes-trabajo-list.component.html',
  styleUrl: './ordenes-trabajo-list.component.scss',
})
export class OrdenesTrabajoListComponent implements OnInit {
  private fb = inject(FormBuilder);
  private usuarios = inject(UsuariosService);
  private ordenes = inject(OrdenesTrabajoService);

  estadosDisponibles: EstadoOt[] = ['RECIBIDA','PRESUPUESTO','APROBADA','EN_CURSO','FINALIZADA','CERRADA'];
  tecnicos: UsuarioResumen[] = [];

  items: OtListaItem[] = [];
  total = 0;
  page = 0;
  size = 20;

  displayedColumns = ['codigo','cliente','estado','tipo','tecnico','actualizado','accion'];

  filtros = this.fb.group({
    estados: [[] as EstadoOt[]],
    tipo: ['' as TipoOt | ''],
    tecnicoId: [''],
    query: [''],
  });

  ngOnInit(): void {
    // Cargo la lista de técnicos para el filtro
    this.usuarios.listar(true).subscribe(u => {
      this.tecnicos = u.filter(x => x.rol === 'TECNICO');
    });

    this.cargar();

    // Suscripción reactiva a los cambios del formulario
    this.filtros.valueChanges.subscribe(() => {
      this.page = 0;
      this.cargar();
    });
  }

  cargar() {
    const v = this.filtros.value;
    
    // Envío los parámetros por separado. 
    // Si el backend no los procesa aún, es una tarea pendiente del lado del servidor.
    this.ordenes.listar({
      estados: v.estados || [],
      tipo: v.tipo || '',
      tecnicoId: v.tecnicoId || '',
      query: v.query || '',
      page: this.page,
      size: this.size,
    }).subscribe({
      next: (res) => {
        this.items = res.items;
        this.total = res.total;
      },
      error: (err) => {
        console.error('Error cargando OTs:', err);
      }
    });
  }

  paginar(e: PageEvent) {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }

  limpiar() {
    this.filtros.reset({
      estados: [],
      tipo: '',
      tecnicoId: '',
      query: ''
    });
  }
}