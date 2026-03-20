import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, tap, catchError, of } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UsuarioResumen, RolUsuario } from '../models/tipos';

type LoginReq = {
  usuario: string;
  password: string;
};

type LoginRes = {
  accessToken: string;
  refreshToken: string | null;
  expiresInSeconds: number;
  usuario: {
    id: string;
    nombre: string;
    usuario: string;
    email?: string;
    rol: string;
    activo: boolean;
  };
};

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly tokenKey = 'rs_token';

  private tokenSig = signal<string | null>(localStorage.getItem(this.tokenKey));
  token = computed(() => this.tokenSig());

  constructor(private http: HttpClient) {}

  login(usuario: string, password: string): Observable<UsuarioResumen> {
    const body: LoginReq = { usuario, password };

    return this.http
      .post<LoginRes>(`${environment.apiBaseUrl}/auth/login`, body, {
        withCredentials: true,
      })
      .pipe(
        tap((res) => {
          if (res.accessToken) {
            localStorage.setItem(this.tokenKey, res.accessToken);
            this.tokenSig.set(res.accessToken);
          }
        }),
        map((res) => ({
          id: res.usuario.id,
          nombre: res.usuario.nombre,
          usuario: res.usuario.usuario,
          email: res.usuario.email,
          rol: res.usuario.rol as RolUsuario,
          activo: res.usuario.activo,
        }))
      );
  }

  refresh(): Observable<boolean> {
    return this.http
      .post<LoginRes>(
        `${environment.apiBaseUrl}/auth/refresh`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap((res) => {
          if (res.accessToken) {
            localStorage.setItem(this.tokenKey, res.accessToken);
            this.tokenSig.set(res.accessToken);
          }
        }),
        map(() => true),
        catchError(() => {
          this.logoutLocal();
          return of(false);
        })
      );
  }

  logout(): Observable<void> {
    return this.http
      .post<void>(
        `${environment.apiBaseUrl}/auth/logout`,
        {},
        { withCredentials: true }
      )
      .pipe(
        tap(() => this.logoutLocal()),
        catchError(() => {
          this.logoutLocal();
          return of(void 0);
        })
      );
  }

  logoutLocal(): void {
    localStorage.removeItem(this.tokenKey);
    this.tokenSig.set(null);
  }

  getToken(): string | null {
    return this.tokenSig();
  }

  isAuthenticated(): boolean {
    const token = this.getToken();
    return !!token && token !== 'undefined' && token !== 'null' && !this.isExpired(token);
  }

  ensureValidOrLogout(): void {
    const token = this.getToken();
    if (!token) return;

    if (this.isExpired(token)) {
      this.logoutLocal();
    }
  }

  private isExpired(token: string): boolean {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (!payload?.exp) return false;
      return payload.exp <= Math.floor(Date.now() / 1000);
    } catch {
      return true;
    }
  }
}