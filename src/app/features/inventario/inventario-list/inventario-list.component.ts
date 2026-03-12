import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { InventarioService } from '../inventario.service';
import { InventarioItemResumenDto } from '../../../core/models/tipos';

@Component({
  selector: 'rs-inventario-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './inventario-list.component.html',
  styleUrl: './inventario-list.component.scss'
})
export class InventarioListComponent implements OnInit {
  private service = inject(InventarioService);
  private router = inject(Router);

  loading = signal(false);
  items = signal<InventarioItemResumenDto[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar({ activo: true, page: 0, size: 100 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  irNuevo(): void {
    this.router.navigateByUrl('/inventario/nuevo');
  }

  bajoStock(i: InventarioItemResumenDto): boolean {
    return Number(i.stockActual) < Number(i.stockMinimo);
  }
}