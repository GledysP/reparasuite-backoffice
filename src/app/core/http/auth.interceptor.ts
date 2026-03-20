import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from '../services/auth.service';
import { catchError, switchMap, throwError } from 'rxjs';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const auth = inject(AuthService);

  const isAuthEndpoint =
    req.url.includes('/auth/login') ||
    req.url.includes('/auth/refresh') ||
    req.url.includes('/auth/logout');

  const token = auth.getToken();

  let authReq = req.clone({
    withCredentials: true,
  });

  if (!isAuthEndpoint && token) {
    authReq = authReq.clone({
      setHeaders: { Authorization: `Bearer ${token}` },
    });
  }

  return next(authReq).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status !== 401 || isAuthEndpoint) {
        return throwError(() => error);
      }

      return auth.refresh().pipe(
        switchMap((ok) => {
          if (!ok) {
            auth.logoutLocal();
            return throwError(() => error);
          }

          const newToken = auth.getToken();
          const retryReq = req.clone({
            withCredentials: true,
            setHeaders: newToken
              ? { Authorization: `Bearer ${newToken}` }
              : {},
          });

          return next(retryReq);
        }),
        catchError((refreshError) => {
          auth.logoutLocal();
          return throwError(() => refreshError);
        })
      );
    })
  );
};