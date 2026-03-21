import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';

export interface WhatsappLinkResponse {
  url: string;
}

@Injectable({ providedIn: 'root' })
export class WhatsappService {
  constructor(private http: HttpClient) {}

  invitarRegistro(): Observable<WhatsappLinkResponse> {
    return this.http.get<WhatsappLinkResponse>(
      `${environment.apiBaseUrl}/whatsapp/invitar-registro`
    );
  }

  recordarLogin(clienteId: string): Observable<WhatsappLinkResponse> {
    return this.http.get<WhatsappLinkResponse>(
      `${environment.apiBaseUrl}/whatsapp/recordar-login/${clienteId}`
    );
  }

  generarSeguimientoOt(otId: string): Observable<WhatsappLinkResponse> {
    return this.http.get<WhatsappLinkResponse>(
      `${environment.apiBaseUrl}/whatsapp/seguimiento-ot/${otId}`
    );
  }
}