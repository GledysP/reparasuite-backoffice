import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { NgIf } from '@angular/common';

import { MatCardModule } from '@angular/material/card';
import { MatTabsModule } from '@angular/material/tabs';
import { MatTableModule } from '@angular/material/table';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';

import { ClientesService } from '../clientes.service';
import { ClienteResumen } from '../../../core/models/tipos';

@Component({
  selector: 'rs-clientes-detalle',
  standalone: true,
  imports: [
    NgIf,
    RouterLink,
    MatCardModule, MatTabsModule, MatTableModule, MatPaginatorModule
  ],
  templateUrl: './clientes-detalle.component.html',
  styleUrl: './clientes-detalle.component.scss',
})
export class ClientesDetalleComponent implements OnInit {
  id!: string;
  cliente: ClienteResumen | null = null;

  displayedColumns = ['codigo','estado','tipo','actualizadoEn','accion'];
  ordenes: any[] = [];
  total = 0;
  page = 0;
  size = 20;

  constructor(private route: ActivatedRoute, private clientes: ClientesService) {}

  ngOnInit(): void {
    this.id = this.route.snapshot.paramMap.get('id')!;
    this.clientes.obtener(this.id).subscribe(c => this.cliente = c);
    this.cargarOrdenes();
  }

  cargarOrdenes() {
    this.clientes.ordenesDelCliente(this.id, this.page, this.size).subscribe(res => {
      this.ordenes = res.items;
      this.total = res.total;
    });
  }

  paginar(e: PageEvent) {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargarOrdenes();
  }
}
