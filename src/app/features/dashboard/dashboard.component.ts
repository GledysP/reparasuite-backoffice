import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { OrdenesTrabajoService } from '../ordenes-trabajo/ordenes-trabajo.service';
import { OtListaItem } from '../../core/models/tipos';

@Component({
  selector: 'rs-dashboard',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatIconModule,
    MatButtonModule,
    RouterLink,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private ordenesService = inject(OrdenesTrabajoService);

  stats = {
    received: 0,
    quotation: 0,
    inProgress: 0,
    completed: 0,
    today: 0,
    overdue: 0,
  };

  recentOrders: OtListaItem[] = [];
  displayedColumns = ['codigo', 'cliente', 'estado', 'tipo', 'tecnico', 'fecha', 'accion'];

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos(): void {
    this.ordenesService.listar({ page: 0, size: 50, sort: 'updatedAt,desc' }).subscribe({
      next: (res) => {
        const items = res?.items ?? [];
        this.recentOrders = items.slice(0, 5);

        this.stats.received = items.filter((o) => String(o.estado) === 'RECIBIDA').length;
        this.stats.quotation = items.filter((o) => String(o.estado) === 'PRESUPUESTO').length;
        this.stats.inProgress = items.filter((o) => String(o.estado) === 'EN_CURSO').length;
        this.stats.completed = items.filter((o) => String(o.estado) === 'FINALIZADA').length;

        const todayKey = this.toIsoDateKey(new Date());

        this.stats.today = items.filter((o) => {
          const d = this.parseDate(o.updatedAt);
          return d ? this.toIsoDateKey(d) === todayKey : false;
        }).length;

        this.stats.overdue = items.filter((o) => this.isOverdue(o)).length;
      },
      error: () => {
        this.recentOrders = [];
        this.stats = {
          received: 0,
          quotation: 0,
          inProgress: 0,
          completed: 0,
          today: 0,
          overdue: 0,
        };
      },
    });
  }

  trackByOrderId(_: number, item: OtListaItem): string {
    return item.id;
  }

  statusLabel(value: string | null | undefined): string {
    if (!value) return '—';

    const map: Record<string, string> = {
      RECIBIDA: 'Recibida',
      PRESUPUESTO: 'Presupuesto',
      EN_CURSO: 'En curso',
      APROBADA: 'Aprobada',
      FINALIZADA: 'Finalizada',
      CERRADA: 'Cerrada',
    };

    return map[value] ?? this.textLabel(value);
  }

  textLabel(value: string | null | undefined): string {
    if (!value) return '—';

    return value
      .toString()
      .toLowerCase()
      .split('_')
      .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
      .join(' ');
  }

  toDateSafe(value: string | null | undefined): string {
    const d = this.parseDate(value);
    if (!d) return '—';

    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private parseDate(value: string | null | undefined): Date | null {
    if (!value) return null;

    const normalized = value.includes('T') ? value : value.replace(' ', 'T');
    const d = new Date(normalized);

    return isNaN(d.getTime()) ? null : d;
  }

  private toIsoDateKey(date: Date): string {
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');

    return `${yyyy}-${mm}-${dd}`;
  }

  private isOverdue(order: OtListaItem): boolean {
    const activeStates = ['RECIBIDA', 'PRESUPUESTO', 'APROBADA', 'EN_CURSO'];
    if (!activeStates.includes(String(order.estado))) return false;

    const d = this.parseDate(order.updatedAt);
    if (!d) return false;

    const diffMs = Date.now() - d.getTime();
    const diffDays = diffMs / (1000 * 60 * 60 * 24);

    return diffDays >= 7;
  }
}