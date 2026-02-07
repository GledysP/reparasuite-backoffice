import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { UsuarioResumen } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  constructor(private http: HttpClient) {}

  listar(activos?: boolean): Observable<UsuarioResumen[]> {
    const params: any = {};
    if (activos !== undefined) params.activos = activos;
    return this.http.get<UsuarioResumen[]>(`${environment.apiBaseUrl}/usuarios`, { params });
  }
}
