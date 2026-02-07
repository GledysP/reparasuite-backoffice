import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

import { RespuestaPaginada } from '../../core/models/api';
import { ClienteResumen } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class ClientesService {
  constructor(private http: HttpClient) {}

  listar(query: string, page = 0, size = 20): Observable<RespuestaPaginada<ClienteResumen>> {
    const params: any = { page, size };
    if (query) params.query = query;
    return this.http.get<RespuestaPaginada<ClienteResumen>>(`${environment.apiBaseUrl}/clientes`, { params });
  }

  obtener(id: string): Observable<ClienteResumen> {
    return this.http.get<ClienteResumen>(`${environment.apiBaseUrl}/clientes/${id}`);
  }

  ordenesDelCliente(id: string, page = 0, size = 20): Observable<RespuestaPaginada<any>> {
    const params: any = { page, size };
    return this.http.get<RespuestaPaginada<any>>(`${environment.apiBaseUrl}/clientes/${id}/ordenes-trabajo`, { params });
  }
}
