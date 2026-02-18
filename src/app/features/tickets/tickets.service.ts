import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { RespuestaPaginada } from '../../core/models/api';
import { TicketDetalleDto } from '../../core/models/tipos';

// DTO mínimo para lista backoffice (si ya tienes otro, puedes mantenerlo)
export interface TicketBackofficeListaItem {
  id: string;
  estado: string;
  asunto: string;
  updatedAt: string;
  clienteId: string;
  clienteNombre: string;
  clienteEmail: string;
}

export interface TicketCrearOtResponse {
  ticketId: string;
  ordenTrabajoId: string;
  ordenTrabajoCodigo?: string | null;
}

@Injectable({ providedIn: 'root' })
export class TicketsService {
  private readonly url = `${environment.apiBaseUrl}/backoffice/tickets`;

  constructor(private http: HttpClient) {}

  listar(page = 0, size = 20): Observable<RespuestaPaginada<TicketBackofficeListaItem>> {
    const params = new HttpParams()
      .set('page', String(page))
      .set('size', String(size));

    return this.http.get<RespuestaPaginada<TicketBackofficeListaItem>>(this.url, { params });
  }

  obtener(id: string): Observable<TicketDetalleDto> {
    return this.http.get<TicketDetalleDto>(`${this.url}/${encodeURIComponent(id)}`);
  }

  enviarMensaje(id: string, contenido: string): Observable<void> {
    return this.http.post<void>(`${this.url}/${encodeURIComponent(id)}/mensajes`, { contenido });
  }

  // ✅ NUEVO: crear OT desde ticket
  crearOtDesdeTicket(id: string): Observable<TicketCrearOtResponse> {
    return this.http.post<TicketCrearOtResponse>(`${this.url}/${encodeURIComponent(id)}/crear-ot`, {});
  }
}
