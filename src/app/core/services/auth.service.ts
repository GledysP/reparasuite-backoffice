import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map, tap } from 'rxjs';
import { UsuarioResumen } from '../models/tipos';

type LoginReq = { usuario: string; password: string };
type LoginRes = {
  accessToken: string;
  tokenType: 'Bearer';
  usuario: { id: string; nombre: string; rol: any };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'rs_token';

  constructor(private http: HttpClient) {}

  login(usuario: string, password: string): Observable<UsuarioResumen> {
    const body: LoginReq = { usuario, password };
    return this.http.post<LoginRes>(`${environment.apiBaseUrl}/auth/login`, body).pipe(
      tap(res => localStorage.setItem(this.tokenKey, res.accessToken)),
      map(res => ({ id: res.usuario.id, nombre: res.usuario.nombre, rol: res.usuario.rol }))
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    return !!this.getToken();
  }
}
