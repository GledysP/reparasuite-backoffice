import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog'; // <-- 1. Importamos el Dialog

import { EquiposService } from '../equipos.service';
import { EquipoResumenDto } from '../../../core/models/tipos';
// <-- 2. Importa tu componente del modal (Ajusta la ruta si es necesario)
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
    MatDialogModule 
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

  irNuevo(): void {
    this.router.navigateByUrl('/equipos/nuevo');
  }

  irCategorias(): void {
    // <--  Abrimos tu modal de categorías
    const dialogRef = this.dialog.open(CategoriaEquipoDialogComponent, {
      width: '520px',
      panelClass: 'rs-dialog-custom',
      disableClose: true, // Evita que se cierre si hace clic afuera por error
      data: { categoria: null } // Pasamos null porque es una creación nueva
    });

    // Opcional:  recargar algo cuando el modal se cierre
    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        console.log('Categoría guardada. Refrescando datos si es necesario...');
      }
    });
  }
}