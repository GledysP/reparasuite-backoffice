import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiListaResponse,
  InventarioCategoriaDto,
  InventarioItemDetalleDto,
  InventarioItemResumenDto,
  InventarioMovimientoDto
} from '../../core/models/tipos';

export interface InventarioGuardarRequest {
  sku: string;
  codigoBarras?: string | null;
  nombre: string;
  descripcion?: string | null;
  categoriaId?: string | null;
  marca?: string | null;
  modeloCompatibilidad?: string | null;
  unidadMedida?: string | null;
  stockMinimo?: string | null;
  stockMaximo?: string | null;
  controlaStock?: boolean | null;
  permiteStockNegativo?: boolean | null;
  costoPromedio?: string | null;
  ultimoCosto?: string | null;
  precioVenta?: string | null;
  ubicacionAlmacen?: string | null;
  notas?: string | null;
  activo?: boolean | null;
}

export interface InventarioMovimientoGuardarRequest {
  tipoMovimiento: string;
  cantidad: string;
  costoUnitario?: string | null;
  motivo?: string | null;
  observacion?: string | null;
}

@Injectable({ providedIn: 'root' })
export class InventarioService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/inventario`;

  listar(f: { activo?: boolean; page?: number; size?: number }): Observable<ApiListaResponse<InventarioItemResumenDto>> {
    let params = new HttpParams()
      .set('page', String(f.page ?? 0))
      .set('size', String(f.size ?? 20));

    if (typeof f.activo === 'boolean') params = params.set('activo', String(f.activo));

    return this.http.get<ApiListaResponse<InventarioItemResumenDto>>(this.base, { params });
  }

  obtener(id: string): Observable<InventarioItemDetalleDto> {
    return this.http.get<InventarioItemDetalleDto>(`${this.base}/${id}`);
  }

  crear(body: InventarioGuardarRequest): Observable<InventarioItemDetalleDto> {
    return this.http.post<InventarioItemDetalleDto>(this.base, body);
  }

  actualizar(id: string, body: InventarioGuardarRequest): Observable<InventarioItemDetalleDto> {
    return this.http.put<InventarioItemDetalleDto>(`${this.base}/${id}`, body);
  }

  categorias(): Observable<InventarioCategoriaDto[]> {
    return this.http.get<InventarioCategoriaDto[]>(`${this.base}/catalogos/categorias`);
  }

  movimientos(id: string): Observable<InventarioMovimientoDto[]> {
    return this.http.get<InventarioMovimientoDto[]>(`${this.base}/${id}/movimientos`);
  }

  registrarMovimiento(id: string, body: InventarioMovimientoGuardarRequest): Observable<InventarioMovimientoDto> {
    return this.http.post<InventarioMovimientoDto>(`${this.base}/${id}/movimientos`, body);
  }
}