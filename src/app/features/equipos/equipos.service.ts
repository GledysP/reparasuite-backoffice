import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  ApiListaResponse,
  CategoriaEquipoDto,
  CategoriaEquipoFallaDto,
  EquipoDetalleDto,
  EquipoResumenDto
} from '../../core/models/tipos';

export interface EquipoGuardarRequest {
  clienteId: string;
  categoriaEquipoId?: string | null;
  codigoInterno?: string | null;
  tipoEquipo?: string | null;
  marca?: string | null;
  modelo?: string | null;
  numeroSerie?: string | null;
  descripcionGeneral?: string | null;
  fechaCompra?: string | null;
  garantiaHasta?: string | null;
  ubicacionHabitual?: string | null;
  notasTecnicas?: string | null;
  estadoActivo?: boolean | null;
}

export interface CategoriaEquipoGuardarRequest {
  codigo: string;
  nombre: string;
  descripcion?: string | null;
  icono?: string | null;
  ordenVisual?: number | null;
  activa?: boolean | null;
}

@Injectable({ providedIn: 'root' })
export class EquiposService {
  private http = inject(HttpClient);
  private base = `${environment.apiBaseUrl}/equipos`;

  listar(f: { clienteId?: string; activo?: boolean; page?: number; size?: number }): Observable<ApiListaResponse<EquipoResumenDto>> {
    let params = new HttpParams()
      .set('page', String(f.page ?? 0))
      .set('size', String(f.size ?? 20));

    if (f.clienteId) params = params.set('clienteId', f.clienteId);
    if (typeof f.activo === 'boolean') params = params.set('activo', String(f.activo));

    return this.http.get<ApiListaResponse<EquipoResumenDto>>(this.base, { params });
  }

  obtener(id: string): Observable<EquipoDetalleDto> {
    return this.http.get<EquipoDetalleDto>(`${this.base}/${id}`);
  }

  crear(body: EquipoGuardarRequest): Observable<EquipoDetalleDto> {
    return this.http.post<EquipoDetalleDto>(this.base, body);
  }

  actualizar(id: string, body: EquipoGuardarRequest): Observable<EquipoDetalleDto> {
    return this.http.put<EquipoDetalleDto>(`${this.base}/${id}`, body);
  }

  desactivar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.base}/${id}`);
  }

  categorias(): Observable<CategoriaEquipoDto[]> {
    return this.http.get<CategoriaEquipoDto[]>(`${this.base}/catalogos/categorias`);
  }

  crearCategoria(body: CategoriaEquipoGuardarRequest): Observable<CategoriaEquipoDto> {
    return this.http.post<CategoriaEquipoDto>(`${this.base}/catalogos/categorias`, body);
  }

  actualizarCategoria(id: string, body: CategoriaEquipoGuardarRequest): Observable<CategoriaEquipoDto> {
    return this.http.put<CategoriaEquipoDto>(`${this.base}/catalogos/categorias/${id}`, body);
  }

  fallasPorCategoria(categoriaId: string): Observable<CategoriaEquipoFallaDto[]> {
    return this.http.get<CategoriaEquipoFallaDto[]>(`${this.base}/catalogos/categorias/${categoriaId}/fallas`);
  }
}