import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

import { RespuestaPaginada } from '../../core/models/api';
import { EstadoOt, TipoOt } from '../../core/models/enums';
import { OtDetalle, OtListaItem } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoService {
  constructor(private http: HttpClient) {}

  listar(f: {
    estados?: EstadoOt[];
    tipo?: TipoOt | '';
    tecnicoId?: string | '';
    query?: string | '';
    page?: number;
    size?: number;
    sort?: string;
  }): Observable<RespuestaPaginada<OtListaItem>> {
    const params: any = {
      page: f.page ?? 0,
      size: f.size ?? 20,
      sort: f.sort ?? 'actualizadoEn,desc',
    };

    if (f.query) params.query = f.query;
    if (f.tipo) params.tipo = f.tipo;
    if (f.tecnicoId) params.tecnicoId = f.tecnicoId;
    if (f.estados?.length) params.estado = f.estados; // multi

    return this.http.get<RespuestaPaginada<OtListaItem>>(`${environment.apiBaseUrl}/ordenes-trabajo`, { params });
  }

  crear(body: any): Observable<{ id: string; codigo: string }> {
    return this.http.post<{ id: string; codigo: string }>(`${environment.apiBaseUrl}/ordenes-trabajo`, body);
  }

  obtener(id: string): Observable<OtDetalle> {
    return this.http.get<OtDetalle>(`${environment.apiBaseUrl}/ordenes-trabajo/${id}`);
  }

  cambiarEstado(id: string, a: EstadoOt): Observable<{ estado: EstadoOt; actualizadoEn: string }> {
    return this.http.post<{ estado: EstadoOt; actualizadoEn: string }>(
      `${environment.apiBaseUrl}/ordenes-trabajo/${id}/cambiar-estado`,
      { a }
    );
  }

  anadirNota(id: string, contenido: string): Observable<{ id: string; creadoEn: string }> {
    return this.http.post<{ id: string; creadoEn: string }>(
      `${environment.apiBaseUrl}/ordenes-trabajo/${id}/notas`,
      { contenido }
    );
  }

  subirFoto(id: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${environment.apiBaseUrl}/ordenes-trabajo/${id}/fotos`, fd);
  }
}
