import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';

import { OrdenesTrabajoService } from '../ordenes-trabajo/ordenes-trabajo.service';
import { EquiposService } from '../equipos/equipos.service';
import { InventarioService } from '../inventario/inventario.service';
import { OtListaItem, EquipoResumenDto, InventarioItemResumenDto } from '../../core/models/tipos';

import { MatSnackBar } from '@angular/material/snack-bar';
import { WhatsappService } from '../../core/services/whatsapp.service';
import { MatSnackBarModule } from '@angular/material/snack-bar';

interface CalendarDay {
  label: number;
  currentMonth: boolean;
  isToday: boolean;
}

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
    MatSnackBarModule,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private ordenesService = inject(OrdenesTrabajoService);
  private equiposService = inject(EquiposService);
  private inventarioService = inject(InventarioService);
  private whatsappService = inject(WhatsappService);
  private snack = inject(MatSnackBar);
  

  stats = {
    received: 0,
    quotation: 0,
    inProgress: 0,
    completed: 0,
    today: 0,
    overdue: 0,
  };

  recentOrders: OtListaItem[] = [];
  recentEquipos: EquipoResumenDto[] = [];
  recentPiezas: InventarioItemResumenDto[] = [];

  displayedColumns = ['codigo', 'cliente', 'estado', 'prioridad', 'tipo', 'tecnico', 'fecha', 'accion'];
  equipoColumns = ['codigo', 'modelo', 'cliente', 'accion'];
  piezaColumns = ['nombre', 'stock', 'precio', 'accion'];

  weekDays = ['L', 'M', 'X', 'J', 'V', 'S', 'D'];
  calendarMonthLabel = '';
  calendarDays: CalendarDay[] = [];

  ngOnInit(): void {
    this.cargarDatos();
    this.cargarEquiposRecientes();
    this.cargarInventarioReciente();
    this.buildCalendar();
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

  cargarEquiposRecientes(): void {
    this.equiposService.listar({ activo: true, page: 0, size: 5 }).subscribe({
      next: (res) => (this.recentEquipos = res?.items ?? []),
      error: () => (this.recentEquipos = []),
    });
  }

  cargarInventarioReciente(): void {
    this.inventarioService.listar({ activo: true, page: 0, size: 5 }).subscribe({
      next: (res) => (this.recentPiezas = res?.items ?? []),
      error: () => (this.recentPiezas = []),
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

  getPriorityLabel(order: OtListaItem): string {
    const tone = this.getPriorityTone(order);

    if (tone === 'alta') return 'Alta';
    if (tone === 'media') return 'Media';
    return 'Baja';
  }

  getPriorityTone(order: OtListaItem): 'alta' | 'media' | 'baja' {
    if (this.isOverdue(order)) return 'alta';

    const estado = String(order.estado ?? '');

    if (estado === 'EN_CURSO' || estado === 'PRESUPUESTO' || estado === 'APROBADA') {
      return 'media';
    }

    return 'baja';
  }

  getStockPercent(item: InventarioItemResumenDto): number {
    const stockActual = Number(item.stockActual ?? 0);
    const stockMinimo = Number(item.stockMinimo ?? 0);

    const base = stockMinimo > 0 ? stockMinimo * 2 : Math.max(stockActual, 1);
    const percent = Math.round((stockActual / Math.max(base, 1)) * 100);

    return Math.max(6, Math.min(percent, 100));
  }

  getStockTone(item: InventarioItemResumenDto): 'high' | 'mid' | 'low' {
    const stockActual = Number(item.stockActual ?? 0);
    const stockMinimo = Number(item.stockMinimo ?? 0);

    if (stockActual <= stockMinimo) return 'low';
    if (stockActual <= stockMinimo * 1.5) return 'mid';
    return 'high';
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

  private buildCalendar(referenceDate: Date = new Date()): void {
    const today = new Date();
    const year = referenceDate.getFullYear();
    const month = referenceDate.getMonth();

    const monthNames = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
    ];

    this.calendarMonthLabel = `${monthNames[month]} ${year}`;

    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);

    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = lastDay.getDate();

    const prevMonthLastDay = new Date(year, month, 0).getDate();
    const result: CalendarDay[] = [];

    for (let i = startOffset - 1; i >= 0; i--) {
      result.push({
        label: prevMonthLastDay - i,
        currentMonth: false,
        isToday: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      const isToday =
        today.getFullYear() === year &&
        today.getMonth() === month &&
        today.getDate() === day;

      result.push({
        label: day,
        currentMonth: true,
        isToday,
      });
    }

    const remaining = result.length % 7 === 0 ? 0 : 7 - (result.length % 7);

    for (let day = 1; day <= remaining; day++) {
      result.push({
        label: day,
        currentMonth: false,
        isToday: false,
      });
    }

    this.calendarDays = result;
  }

  invitarPorWhatsapp(): void {
    this.whatsappService.invitarRegistro().subscribe({
      next: (res) => {
        if (!res?.url) {
          this.snack.open('No se pudo generar el enlace de WhatsApp', 'Cerrar', {
            duration: 3000
          });
          return;
        }
  
        window.open(res.url, '_blank', 'noopener,noreferrer');
      },
      error: (err) => {
        console.error('Error generando invitación WhatsApp:', err);
        const msg =
          err?.error?.message ||
          'No se pudo generar el enlace de invitación por WhatsApp';
  
        this.snack.open(msg, 'Cerrar', {
          duration: 3500
        });
      }
    });
  }
}