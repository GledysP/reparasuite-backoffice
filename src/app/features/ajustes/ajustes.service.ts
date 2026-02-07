import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';

import { AjustesTaller } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class AjustesService {
  constructor(private http: HttpClient) {}

  obtenerTaller(): Observable<AjustesTaller> {
    return this.http.get<AjustesTaller>(`${environment.apiBaseUrl}/ajustes/taller`);
  }

  guardarTaller(body: { nombre: string; telefono: string | null; email: string | null; direccion: string | null }): Observable<{ ok: boolean }> {
    return this.http.put<{ ok: boolean }>(`${environment.apiBaseUrl}/ajustes/taller`, body);
  }
}
