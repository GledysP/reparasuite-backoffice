import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RespuestaPaginada } from '../../core/models/api';
import { TicketDetalleDto, TicketBackofficeListaItem } from '../../core/models/tipos';

export interface TicketCrearOtResponse {
  ticketId: string;
  ordenTrabajoId: string;
  codigoOt?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private http = inject(HttpClient);
  private base = (environment.apiBaseUrl || '').replace(/\/$/, '');
  private endpoint = `${this.base}/backoffice/tickets`;

  listar(page = 0, size = 20): Observable<RespuestaPaginada<TicketBackofficeListaItem>> {
    return this.http.get<RespuestaPaginada<TicketBackofficeListaItem>>(
      `${this.endpoint}?page=${page}&size=${size}`
    );
  }

  obtener(id: string): Observable<TicketDetalleDto> {
    return this.http.get<TicketDetalleDto>(`${this.endpoint}/${id}`);
  }

  enviarMensaje(id: string, contenido: string): Observable<void> {
    return this.http.post<void>(`${this.endpoint}/${id}/mensajes`, { contenido });
  }

  subirFoto(id: string, file: File): Observable<any> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post(`${this.endpoint}/${id}/fotos`, fd);
  }

  crearOtDesdeTicket(id: string): Observable<TicketCrearOtResponse> {
    return this.http.post<TicketCrearOtResponse>(`${this.endpoint}/${id}/crear-ot`, {});
  }
}