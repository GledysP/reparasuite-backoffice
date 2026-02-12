import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

import { RespuestaPaginada } from '../../core/models/api';
import { EstadoOt, TipoOt } from '../../core/models/enums';
import { OtDetalle, OtListaItem } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoService {
  private readonly url = `${environment.apiBaseUrl}/ordenes-trabajo`;

  constructor(private http: HttpClient) {}

  // Recupero la lista paginada y filtrada de órdenes
  listar(f: {
    estados?: EstadoOt[];
    tipo?: TipoOt | '';
    tecnicoId?: string | '';
    query?: string | '';
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<RespuestaPaginada<OtListaItem>> {
    let params = new HttpParams()
      .set('page', (f.page ?? 0).toString())
      .set('size', (f.size ?? 20).toString())
      .set('sort', f.sort ?? 'updatedAt,desc'); 

    if (f.query) params = params.set('query', f.query);
    if (f.tipo) params = params.set('tipo', f.tipo);
    if (f.tecnicoId) params = params.set('tecnicoId', f.tecnicoId);

    if (f.estados?.length) {
      f.estados.forEach(e => params = params.append('estado', e));
    }

    return this.http.get<RespuestaPaginada<OtListaItem>>(this.url, { params });
  }

  // Registro una nueva orden en el sistema
  crear(body: any): Observable<{ id: string; codigo: string }> {
    return this.http.post<{ id: string; codigo: string }>(this.url, body);
  }

  // Obtengo el detalle completo incluyendo el historial para el timeline
  obtener(id: string): Observable<OtDetalle> {
    return this.http.get<OtDetalle>(`${this.url}/${id}`);
  }

  // Actualizo el estado de la orden mediante PATCH
  cambiarEstado(id: string, estado: EstadoOt): Observable<void> {
    return this.http.patch<void>(`${this.url}/${id}/estado`, { estado });
  }

  // Añado una nota interna al historial de la orden
  anadirNota(id: string, contenido: string): Observable<{ id: string; creadoEn: string }> {
    return this.http.post<{ id: string; creadoEn: string }>(`${this.url}/${id}/notas`, { contenido });
  }

  // Subo y vinculo una imagen a la orden
  subirFoto(id: string, file: File): Observable<{ url: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ url: string }>(`${this.url}/${id}/fotos`, fd);
  }
}

// Corrijo imports de core/common y aseguro consistencia en endpoints.