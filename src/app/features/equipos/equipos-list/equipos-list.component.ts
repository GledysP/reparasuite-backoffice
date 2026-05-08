import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip'; 

import { EquiposService } from '../equipos.service';
import { EquipoResumenDto } from '../../../core/models/tipos';
import { CategoriaEquipoDialogComponent } from '../categoria-equipo-dialog/categoria-equipo-dialog.component'; 

@Component({
  selector: 'rs-equipos-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatDialogModule,
    MatTooltipModule 
  ],
  templateUrl: './equipos-list.component.html',
  styleUrl: './equipos-list.component.scss'
})
export class EquiposListComponent implements OnInit {
  private readonly service = inject(EquiposService);
  private readonly router = inject(Router);
  private readonly dialog = inject(MatDialog); 

  loading = signal(false);
  items = signal<EquipoResumenDto[]>([]);
  
  // SEÑALES PARA EL BUSCADOR
  searchTerm = signal('');

  // FILTRO EN TIEMPO REAL
  filteredItems = computed(() => {
    const term = this.searchTerm().toLowerCase();
    if (!term) return this.items();
    
    return this.items().filter(e => 
      (e.modelo || '').toLowerCase().includes(term) ||
      (e.marca || '').toLowerCase().includes(term) ||
      (e.codigoEquipo || '').toLowerCase().includes(term) ||
      (e.clienteNombre || '').toLowerCase().includes(term)
    );
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);

    this.service.listar({ activo: true, page: 0, size: 50 }).subscribe({
      next: (res) => {
        this.items.set(res.items ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      }
    });
  }

  buscar(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.searchTerm.set(input.value);
  }

  // NUEVA FUNCIÓN PARA EL BOTÓN "LIMPIAR"
  limpiarFiltro(): void {
    this.searchTerm.set('');
  }

  irNuevo(): void {
    this.router.navigateByUrl('/equipos/nuevo');
  }

  irCategorias(): void {
    const dialogRef = this.dialog.open(CategoriaEquipoDialogComponent, {
      width: '520px',
      panelClass: 'rs-dialog-custom',
      disableClose: true, 
      data: { categoria: null } 
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        // Lógica de recarga si es necesaria
      }
    });
  }

  inactivarEquipo(equipo: EquipoResumenDto): void {
    const confirmacion = window.confirm(`¿Estás seguro de archivar el equipo ${equipo.modelo || ''}? Se marcará como inactivo y no aparecerá en nuevas órdenes.`);
    
    if (confirmacion) {
      const actualizados = this.items().map(e => {
        if (e.id === equipo.id) {
          return { ...e, estadoActivo: false };
        }
        return e;
      });
      
      this.items.set(actualizados);
    }
  }
}