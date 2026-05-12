import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common'; 
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { EquiposService } from '../equipos.service';
import { EquipoDetalleDto } from '../../../core/models/tipos';
import { ImagenModalComponent } from '../imagen-modal.component';

@Component({
  selector: 'rs-equipo-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule, MatTooltipModule, MatDialogModule],
  templateUrl: './equipo-detalle.component.html',
  styleUrl: './equipo-detalle.component.scss'
})
export class EquipoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(EquiposService);
  private readonly dialog = inject(MatDialog);

  item = signal<EquipoDetalleDto | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.obtener(id).subscribe(x => this.item.set(x));
  }

  // MÉTODO PARA ABRIR LA IMAGEN
  abrirImagen(url: string): void {
    this.dialog.open(ImagenModalComponent, {
      data: { url },
      panelClass: 'rs-image-modal-panel',
      maxWidth: '95vw',
      maxHeight: '95vh',
      autoFocus: false
    });
  }

  desactivar(): void {
    const equipo = this.item();
    if (!equipo || !equipo.id) return;
    
    const confirmacion = window.confirm(`¿Estás seguro de archivar el equipo ${equipo.modelo || ''}? Se marcará como inactivo.`);
    
    if (confirmacion) {
      this.service.desactivar(equipo.id).subscribe(() => this.router.navigateByUrl('/equipos'));
    }
  }
}