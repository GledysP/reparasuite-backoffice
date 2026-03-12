import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

import { EquiposService } from '../equipos.service';
import { EquipoDetalleDto } from '../../../core/models/tipos';

@Component({
  selector: 'rs-equipo-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './equipo-detalle.component.html',
  styleUrl: './equipo-detalle.component.scss'
})
export class EquipoDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private service = inject(EquiposService);

  item = signal<EquipoDetalleDto | null>(null);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;
    this.service.obtener(id).subscribe(x => this.item.set(x));
  }

  desactivar(): void {
    const id = this.item()?.id;
    if (!id) return;
    this.service.desactivar(id).subscribe(() => this.router.navigateByUrl('/equipos'));
  }
}