import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

import { RespuestaPaginada } from '../../core/models/api';
import { EstadoOt, TipoOt } from '../../core/models/enums';
import {
  OtDetalle,
  OtListaItem,
  PresupuestoDto,
  CitaDto,
  MensajeOtDto
} from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class OrdenesTrabajoService {
  private readonly url = `${environment.apiBaseUrl}/ordenes-trabajo`;

  constructor(private http: HttpClient) {}

  // -----------------------------
  // LISTADO (paginado + filtros)
  // -----------------------------
  listar(f: {
    estados?: EstadoOt[];
    tipo?: TipoOt | '';
    tecnicoId?: string | '';
    query?: string | '';
    page?: number;
    size?: number;
    sort?: string; // opcional: si tu backend lo soporta
  }): Observable<RespuestaPaginada<OtListaItem>> {
    let params = new HttpParams()
      .set('page', String(f.page ?? 0))
      .set('size', String(f.size ?? 20));

    // Si tu backend NO soporta sort, elimina estas líneas:
    if (f.sort) params = params.set('sort', f.sort);

    if (f.query && f.query.trim()) params = params.set('query', f.query.trim());
    if (f.tipo) params = params.set('tipo', f.tipo);
    if (f.tecnicoId) params = params.set('tecnicoId', f.tecnicoId);

    if (f.estados?.length) {
      f.estados.forEach((e) => (params = params.append('estado', e)));
    }

    return this.http.get<RespuestaPaginada<OtListaItem>>(this.url, { params });
  }

  // -----------------------------
  // CREAR OT
  // -----------------------------
  crear(body: any): Observable<{ id: string; codigo?: string }> {
    return this.http.post<{ id: string; codigo?: string }>(this.url, body);
  }

  // -----------------------------
  // DETALLE OT
  // -----------------------------
  obtener(idOrCodigo: string): Observable<OtDetalle> {
    return this.http.get<OtDetalle>(`${this.url}/${encodeURIComponent(idOrCodigo)}`);
  }

  // -----------------------------
  // ESTADO OT
  // -----------------------------
  cambiarEstado(idOrCodigo: string, estado: EstadoOt): Observable<void> {
    return this.http.patch<void>(`${this.url}/${encodeURIComponent(idOrCodigo)}/estado`, { estado });
  }

  // -----------------------------
  // NOTAS
  // -----------------------------
  anadirNota(idOrCodigo: string, contenido: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${encodeURIComponent(idOrCodigo)}/notas`, { contenido });
  }

  // -----------------------------
  // FOTOS
  // -----------------------------
  subirFoto(idOrCodigo: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.url}/${encodeURIComponent(idOrCodigo)}/fotos`, fd);
  }

  // -----------------------------
  // PRESUPUESTO
  // -----------------------------
  crearPresupuesto(
    idOrCodigo: string,
    body: { importe: number; detalle: string; aceptacionCheck: boolean }
  ): Observable<PresupuestoDto> {
    return this.http.post<PresupuestoDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/presupuesto`,
      body
    );
  }

  enviarPresupuesto(idOrCodigo: string): Observable<PresupuestoDto> {
    return this.http.post<PresupuestoDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/presupuesto/enviar`,
      {}
    );
  }

  aceptarPresupuesto(idOrCodigo: string): Observable<PresupuestoDto> {
    return this.http.post<PresupuestoDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/presupuesto/aceptar`,
      {}
    );
  }

  rechazarPresupuesto(idOrCodigo: string): Observable<PresupuestoDto> {
    return this.http.post<PresupuestoDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/presupuesto/rechazar`,
      {}
    );
  }

  // -----------------------------
  // PAGO
  // -----------------------------
  marcarTransferencia(idOrCodigo: string): Observable<any> {
    return this.http.post(`${this.url}/${encodeURIComponent(idOrCodigo)}/pago/transferencia`, {});
  }

  subirComprobante(idOrCodigo: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.url}/${encodeURIComponent(idOrCodigo)}/pago/comprobante`, fd);
  }

  // -----------------------------
  // CITAS
  // -----------------------------
  crearCita(idOrCodigo: string, body: { inicio: string; fin: string }): Observable<CitaDto> {
    return this.http.post<CitaDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/citas`,
      body
    );
  }

  reprogramarCita(citaId: string, body: { inicio: string; fin: string }): Observable<CitaDto> {
    return this.http.put<CitaDto>(
      `${this.url}/citas/${encodeURIComponent(citaId)}`,
      body
    );
  }

  // -----------------------------
  // MENSAJES
  // -----------------------------
  enviarMensaje(idOrCodigo: string, contenido: string): Observable<MensajeOtDto> {
    return this.http.post<MensajeOtDto>(
      `${this.url}/${encodeURIComponent(idOrCodigo)}/mensajes`,
      { contenido }
    );
  }
}
