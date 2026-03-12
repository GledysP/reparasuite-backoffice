import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { EquiposService } from '../equipos.service';
import { EquipoResumenDto } from '../../../core/models/tipos';

@Component({
  selector: 'rs-equipos-list',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatProgressBarModule],
  templateUrl: './equipos-list.component.html',
  styleUrl: './equipos-list.component.scss'
})
export class EquiposListComponent implements OnInit {
  private service = inject(EquiposService);
  private router = inject(Router);

  loading = signal(false);
  items = signal<EquipoResumenDto[]>([]);

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.service.listar({ activo: true, page: 0, size: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items);
        this.loading.set(false);
      },
      error: () => this.loading.set(false)
    });
  }

  irNuevo(): void {
    this.router.navigateByUrl('/equipos/nuevo');
  }
}