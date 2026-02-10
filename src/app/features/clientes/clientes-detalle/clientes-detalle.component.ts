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
    // Info del cliente
    this.clientesService.obtener(this.id).subscribe(res => this.cliente = res);
    // Historial
    this.cargarHistorial();
  }

  cargarHistorial(): void {
    this.clientesService.ordenesDelCliente(this.id, this.page, this.size)
      .pipe(catchError(() => of({ items: [], total: 0 })))
      .subscribe(res => {
        this.ordenes = res.items;
        this.total = res.total;
        // Contador de órdenes que no están completadas
        this.totalOpen = this.ordenes.filter(o => 
          String(o.estado).toUpperCase() !== 'COMPLETADA' && 
          String(o.estado).toUpperCase() !== 'CLOSED'
        ).length;
      });
  }

  onPageChange(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargarHistorial();
  }
}