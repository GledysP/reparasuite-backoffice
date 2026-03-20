import { Component, DestroyRef, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { debounceTime } from 'rxjs';

import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

import { UsuariosService } from '../../usuarios/usuarios.service';
import { OrdenesTrabajoService } from '../ordenes-trabajo.service';
import { EstadoOt, TipoOt } from '../../../core/models/enums';
import { OtListaItem, UsuarioResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-ordenes-trabajo-list',
  standalone: true,
  imports: [
    CommonModule,
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
    MatSnackBarModule,
  ],
  templateUrl: './ordenes-trabajo-list.component.html',
  styleUrl: './ordenes-trabajo-list.component.scss',
})
export class OrdenesTrabajoListComponent implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly usuarios = inject(UsuariosService);
  private readonly ordenes = inject(OrdenesTrabajoService);
  private readonly snack = inject(MatSnackBar);

  estadosDisponibles: EstadoOt[] = [
    'RECIBIDA',
    'PRESUPUESTO',
    'APROBADA',
    'EN_CURSO',
    'FINALIZADA',
    'CERRADA',
  ];

  tecnicos: UsuarioResumen[] = [];
  items: OtListaItem[] = [];
  total = 0;
  page = 0;
  size = 20;

  deletingId: string | null = null;

  displayedColumns = [
    'codigo',
    'cliente',
    'estado',
    'tipo',
    'tecnico',
    'actualizado',
    'accion',
  ];

  filtros = this.fb.nonNullable.group({
    estado: ['' as EstadoOt | ''],
    tipo: ['' as TipoOt | ''],
    tecnicoId: [''],
    query: [''],
  });

  ngOnInit(): void {
    this.usuarios
      .listar(true)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (usuarios) => {
          this.tecnicos = usuarios.filter(
            (u) => String(u.rol).toUpperCase() === 'TECNICO'
          );
        },
        error: (err) => {
          console.error('Error cargando técnicos:', err);
        },
      });

    this.cargar();

    this.filtros.valueChanges
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe(() => {
        this.page = 0;
        this.cargar();
      });
  }

  cargar(): void {
    const v = this.filtros.getRawValue();

    this.ordenes
      .listar({
        estados: v.estado ? [v.estado] : [],
        tipo: v.tipo || '',
        tecnicoId: v.tecnicoId || '',
        query: v.query?.trim() || '',
        page: this.page,
        size: this.size,
      })
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items = res.items ?? [];
          this.total = res.total ?? 0;

          if (this.page > 0 && this.items.length === 0 && this.total > 0) {
            this.page = Math.max(0, this.page - 1);
            this.cargar();
          }
        },
        error: (err) => {
          console.error('Error cargando OTs:', err);
          this.items = [];
          this.total = 0;
          this.snack.open('Error al cargar órdenes de trabajo', 'OK', { duration: 2500 });
        },
      });
  }

  paginar(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }

  limpiar(): void {
    this.filtros.reset({
      estado: '',
      tipo: '',
      tecnicoId: '',
      query: '',
    });
  }

  trackById(_: number, row: OtListaItem): string {
    return row.id;
  }

  formatoFecha(fecha?: string | null): string {
    if (!fecha) return '—';

    const d = new Date(fecha);
    if (Number.isNaN(d.getTime())) return '—';

    return new Intl.DateTimeFormat('es-ES', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
  }

  tipoTexto(tipo?: string | null): string {
    const value = String(tipo ?? '').toUpperCase();

    if (value === 'DOMICILIO') return 'A domicilio';
    if (value === 'TIENDA') return 'Tienda';

    return '—';
  }

  estadoTexto(estado?: string | null): string {
    const value = String(estado ?? '').toUpperCase();

    switch (value) {
      case 'RECIBIDA':
        return 'RECIBIDA';
      case 'PRESUPUESTO':
        return 'PRESUPUESTO';
      case 'APROBADA':
        return 'APROBADA';
      case 'EN_CURSO':
        return 'EN CURSO';
      case 'FINALIZADA':
        return 'FINALIZADA';
      case 'CERRADA':
        return 'CERRADA';
      default:
        return value ? value.replaceAll('_', ' ') : '—';
    }
  }

  eliminando(row: OtListaItem): boolean {
    return this.deletingId === row.id;
  }

  eliminarOrden(row: OtListaItem): void {
    if (!row?.id || this.deletingId) return;

    const ok = window.confirm(
      `¿Seguro que deseas eliminar la orden ${row.codigo || ''}? Esta acción no se puede deshacer.`
    );

    if (!ok) return;

    this.deletingId = row.id;

    this.ordenes
      .eliminar(row.id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.snack.open('Orden eliminada correctamente', 'OK', { duration: 2200 });
          this.deletingId = null;

          this.items = this.items.filter((x) => x.id !== row.id);
          this.total = Math.max(0, this.total - 1);

          this.cargar();
        },
        error: (err) => {
          console.error('Error eliminando OT:', err);
          this.deletingId = null;

          const msg =
            err?.error?.message ||
            err?.error?.error ||
            'No se pudo eliminar la orden de trabajo';

          this.snack.open(msg, 'OK', { duration: 3200 });
        },
      });
  }
}