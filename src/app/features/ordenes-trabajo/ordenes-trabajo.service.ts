import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
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
    let params = new HttpParams()
      .set('page', (f.page ?? 0).toString())
      .set('size', (f.size ?? 20).toString())
      .set('sort', f.sort ?? 'updatedAt,desc'); 

    if (f.query) params = params.set('query', f.query);
    if (f.tipo) params = params.set('tipo', f.tipo);
    if (f.tecnicoId) params = params.set('tecnicoId', f.tecnicoId);

    if (f.estados && f.estados.length > 0) {
      f.estados.forEach(estado => {
        params = params.append('estado', estado);
      });
    }

    return this.http.get<RespuestaPaginada<OtListaItem>>(
      `${environment.apiBaseUrl}/ordenes-trabajo`, 
      { params }
    );
  }

  crear(body: any): Observable<{ id: string; codigo: string }> {
    return this.http.post<{ id: string; codigo: string }>(
      `${environment.apiBaseUrl}/ordenes-trabajo`, 
      body
    );
  }

  obtener(id: string): Observable<OtDetalle> {
    return this.http.get<OtDetalle>(`${environment.apiBaseUrl}/ordenes-trabajo/${id}`);
  }

  cambiarEstado(id: string, nuevoEstado: EstadoOt): Observable<any> {
    // CORRECCIÓN SWAGGER: Método PATCH y endpoint /estado
    return this.http.patch(
      `${environment.apiBaseUrl}/ordenes-trabajo/${id}/estado`,
      { estado: nuevoEstado }
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