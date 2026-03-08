import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import type { UsuarioResumen } from '../../core/models/tipos';

export interface UsuarioUpdateRequest {
  nombre: string;
  usuario: string;
  email: string;
  rol: string; // requerido por backend (RolUsuario.valueOf)
}

@Injectable({ providedIn: 'root' })
export class MiPerfilService {
  private readonly base = `${environment.apiBaseUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  obtener(id: string): Observable<UsuarioResumen> {
    return this.http.get<UsuarioResumen>(`${this.base}/${encodeURIComponent(id)}`);
  }

  actualizar(id: string, body: UsuarioUpdateRequest): Observable<UsuarioResumen> {
    return this.http.put<UsuarioResumen>(`${this.base}/${encodeURIComponent(id)}`, body);
  }
}