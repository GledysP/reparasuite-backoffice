import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';

import { InventarioService } from '../inventario.service';
import {
  InventarioItemDetalleDto,
  InventarioMovimientoDto
} from '../../../core/models/tipos';
import { InventarioMovimientoDialogComponent } from '../inventario-movimiento-dialog/inventario-movimiento-dialog.component';

@Component({
  selector: 'rs-inventario-detalle',
  standalone: true,
  imports: [
    CommonModule,
    RouterLink,
    DatePipe,
    MatCardModule,
    MatButtonModule
  ],
  templateUrl: './inventario-detalle.component.html',
  styleUrl: './inventario-detalle.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class InventarioDetalleComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly service = inject(InventarioService);
  private readonly dialog = inject(MatDialog);

  readonly item = signal<InventarioItemDetalleDto | null>(null);
  readonly movimientos = signal<InventarioMovimientoDto[]>([]);

  private readonly moneyFormatter = new Intl.NumberFormat('es-DO', {
    style: 'currency',
    currency: 'DOP',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (!id) return;

    this.cargarDetalle(id);
    this.cargarMovimientos(id);
  }

  abrirMovimiento(): void {
    const current = this.item();
    if (!current) return;

    const ref = this.dialog.open(InventarioMovimientoDialogComponent, {
      width: '620px',
      maxWidth: '95vw',
      autoFocus: false,
      restoreFocus: true,
      data: { itemId: current.id }
    });

    ref.afterClosed().subscribe((ok) => {
      if (!ok) return;
      this.cargarDetalle(current.id);
      this.cargarMovimientos(current.id);
    });
  }

  numberValue(value: number | string | null | undefined): number {
    const parsed = typeof value === 'number' ? value : Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }

  formatMoney(value: number | string | null | undefined): string {
    return this.moneyFormatter.format(this.numberValue(value));
  }

  unitLabel(value: string | null | undefined): string {
    const normalized = value?.trim();
    return normalized ? normalized.toUpperCase() : 'UNIDAD';
  }

  hasLowStock(item: InventarioItemDetalleDto): boolean {
    return this.numberValue(item.stockActual) <= this.numberValue(item.stockMinimo);
  }

  tipoMovimientoLabel(tipo: string | null | undefined): string {
    switch (tipo) {
      case 'ENTRADA':
        return 'Entrada';
      case 'SALIDA':
        return 'Salida';
      case 'AJUSTE_POSITIVO':
        return 'Ajuste positivo';
      case 'AJUSTE_NEGATIVO':
        return 'Ajuste negativo';
      default:
        return tipo || '—';
    }
  }

  private cargarDetalle(id: string): void {
    this.service.obtener(id).subscribe({
      next: (value) => this.item.set(value)
    });
  }

  private cargarMovimientos(id: string): void {
    this.service.movimientos(id).subscribe({
      next: (value) => this.movimientos.set(value)
    });
  }
}