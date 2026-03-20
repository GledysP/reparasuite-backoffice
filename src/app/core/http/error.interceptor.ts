import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { catchError, throwError } from 'rxjs';
import { AuthService } from '../services/auth.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);
  const router = inject(Router);
  const snack = inject(MatSnackBar);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      const isAuthEndpoint =
        req.url.includes('/auth/login') ||
        req.url.includes('/auth/refresh') ||
        req.url.includes('/auth/logout');

      if (error.status === 401) {
        if (isAuthEndpoint || !auth.isAuthenticated()) {
          auth.logoutLocal();
          router.navigateByUrl('/login');
        }
      } else if (error.status === 403) {
        snack.open('No tienes permisos para realizar esta acción', 'Cerrar', {
          duration: 3000,
        });
      } else if (error.status === 429) {
        snack.open('Demasiados intentos. Intenta más tarde.', 'Cerrar', {
          duration: 3500,
        });
      } else if (error.status >= 500) {
        snack.open('Ha ocurrido un error interno. Intenta más tarde.', 'Cerrar', {
          duration: 3000,
        });
      }

      return throwError(() => error);
    })
  );
};