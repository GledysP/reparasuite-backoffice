import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable } from 'rxjs';
import { UsuarioResumen } from '../../core/models/tipos';

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly URL = `${environment.apiBaseUrl}/usuarios`;

  constructor(private http: HttpClient) {}

  listar(activos?: boolean): Observable<UsuarioResumen[]> {
    const params: any = {};
    if (activos !== undefined) params.activos = activos;
    return this.http.get<UsuarioResumen[]>(this.URL, { params });
  }

  obtenerPorId(id: string): Observable<any> {
    return this.http.get<any>(`${this.URL}/${id}`);
  }

  crear(usuario: any): Observable<any> {
    return this.http.post<any>(this.URL, usuario);
  }

  actualizar(id: string, usuario: any): Observable<any> {
    return this.http.put<any>(`${this.URL}/${id}`, usuario);
  }

cambiarEstado(id: string, activo: boolean): Observable<void> {
    return this.http.patch<void>(`${this.URL}/${id}/estado`, { activo });
  }

  // AÑADE ESTO PARA SOLUCIONAR EL ERROR:
  eliminar(id: string): Observable<void> {
    return this.http.delete<void>(`${this.URL}/${id}`);
  }
}