import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, map, tap } from 'rxjs';
import { UsuarioResumen, RolUsuario } from '../models/tipos'; // Importamos RolUsuario

type LoginReq = { usuario: string; password: string };

type LoginRes = {
  token: string;
  usuario: {
    id: string;
    nombre: string;
    usuario: string;
    rol: string; // El backend envía un string
    activo: boolean;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'rs_token';

  constructor(private http: HttpClient) {}

  login(usuario: string, password: string): Observable<UsuarioResumen> {
    const body: LoginReq = { usuario, password };

    return this.http
      .post<LoginRes>(`${environment.apiBaseUrl}/auth/login`, body)
      .pipe(
        tap((res) => {
          if (res.token) {
            localStorage.setItem(this.tokenKey, res.token);
          }
        }),
        map((res) => ({
          id: res.usuario.id,
          nombre: res.usuario.nombre,
          // Forzamos el casting a RolUsuario para que TS no se queje
          rol: res.usuario.rol as RolUsuario, 
        }))
      );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    // Una validación extra: que el token no sea "undefined" o "null" en string
    return !!token && token !== 'undefined' && token !== 'null';
  }
}