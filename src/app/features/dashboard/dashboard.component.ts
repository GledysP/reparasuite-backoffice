import { Component, OnInit, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterLink } from '@angular/router';
import { OrdenesTrabajoService } from '../ordenes-trabajo/ordenes-trabajo.service';

@Component({
  selector: 'rs-dashboard',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatTableModule, MatIconModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private ordenesService = inject(OrdenesTrabajoService);

  stats = { received: 0, quotation: 0, inProgress: 0, completed: 0, today: 0, overdue: 0 };
  recentOrders: any[] = [];
  displayedColumns = ['codigo', 'cliente', 'estado', 'tipo', 'tecnico', 'fecha', 'accion'];

  ngOnInit(): void {
    this.cargarDatos();
  }

  cargarDatos() {
    this.ordenesService.listar({ page: 0, size: 50 }).subscribe({
      next: (res: any) => {
        const items = res.items || [];
        this.recentOrders = items.slice(0, 5);

        // Mapeo de estados según el diseño
        this.stats.received = items.filter((o: any) => o.estado === 'RECIBIDA').length;
        this.stats.quotation = items.filter((o: any) => o.estado === 'PRESUPUESTO').length;
        this.stats.inProgress = items.filter((o: any) => o.estado === 'EN_CURSO').length;
        this.stats.completed = items.filter((o: any) => o.estado === 'FINALIZADA').length;
        
        const hoy = new Date().toISOString().split('T')[0];
        this.stats.today = items.filter((o: any) => o.createdAt?.startsWith(hoy)).length;
        this.stats.overdue = this.stats.received; // Lógica de ejemplo
      }
    });
  }
}