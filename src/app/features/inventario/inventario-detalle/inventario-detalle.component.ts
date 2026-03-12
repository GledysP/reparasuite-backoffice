import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';

import { InventarioService } from '../inventario.service';
import { InventarioItemDetalleDto, InventarioMovimientoDto } from '../../../core/models/tipos';
import { InventarioMovimientoDialogComponent } from '../inventario-movimiento-dialog/inventario-movimiento-dialog.component';

@Component({
  selector: 'rs-inventario-detalle',
  standalone: true,
  imports: [CommonModule, RouterLink, DatePipe, MatCardModule, MatButtonModule, MatDialogModule],
  templateUrl: './inventario-detalle.component.html',
  styleUrl: './inventario-detalle.component.scss'
})
export class InventarioDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private service = inject(InventarioService);
  private dialog = inject(MatDialog);

  item = signal<InventarioItemDetalleDto | null>(null);
  movimientos = signal<InventarioMovimientoDto[]>([]);

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.service.obtener(id).subscribe(x => this.item.set(x));
    this.service.movimientos(id).subscribe(x => this.movimientos.set(x));
  }

  abrirMovimiento(): void {
    const id = this.item()?.id;
    if (!id) return;

    const ref = this.dialog.open(InventarioMovimientoDialogComponent, {
      width: '520px',
      maxWidth: '92vw',
      data: { itemId: id }
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.service.obtener(id).subscribe(x => this.item.set(x));
      this.service.movimientos(id).subscribe(x => this.movimientos.set(x));
    });
  }
}