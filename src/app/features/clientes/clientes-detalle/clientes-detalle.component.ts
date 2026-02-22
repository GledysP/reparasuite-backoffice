import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { ClientesService } from '../clientes.service';
import { ClienteResumen, ClienteOrdenItem } from '../../../core/models/tipos';

@Component({
  selector: 'app-clientes-detalle',
  standalone: true,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatTabsModule,
    MatTableModule, MatIconModule, MatButtonModule, MatPaginatorModule
  ],
  templateUrl: './clientes-detalle.component.html',
  styleUrls: ['./clientes-detalle.component.scss']
})
export class ClientesDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private clientesService = inject(ClientesService);

  id!: string;
  cliente: ClienteResumen | null = null;
  ordenes: ClienteOrdenItem[] = [];
  displayedColumns = ['codigo', 'estado', 'tipo', 'updatedAt', 'accion'];

  total = 0;
  totalOpen = 0;
  page = 0;
  size = 10;

  ngOnInit(): void {
    const routeId = this.route.snapshot.paramMap.get('id');
    if (routeId) {
      this.id = routeId;
      this.cargarTodo();
    }
  }

  cargarTodo(): void {
    this.clientesService.obtener(this.id).subscribe(res => this.cliente = res);
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.clientesService.ordenesDelCliente(this.id, this.page, this.size)
      .pipe(catchError(() => of({ items: [], total: 0 })))
      .subscribe(res => {
        this.ordenes = res.items;
        this.total = res.total;

        // Conteo de "abiertas" (ajusta si usas más estados cerrados)
        this.totalOpen = this.ordenes.filter(o => {
          const s = String(o.estado).toUpperCase();
          return s !== 'CERRADA' && s !== 'FINALIZADA' && s !== 'COMPLETADA' && s !== 'CLOSED';
        }).length;
      });
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargarHistorial();
  }

  get ultimaVisita(): string | null {
    if (!this.ordenes?.length) return null;
    return this.ordenes[0]?.updatedAt ?? null;
  }

  get initials(): string {
    const n = (this.cliente?.nombre ?? '').trim();
    if (!n) return 'CL';
    const parts = n.split(/\s+/).filter(Boolean);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[1][0]).toUpperCase();
  }

  trackByOt(_index: number, item: ClienteOrdenItem): string {
    return item.id;
  }
}