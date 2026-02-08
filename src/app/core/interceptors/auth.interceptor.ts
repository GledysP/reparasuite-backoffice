import { HttpInterceptorFn } from '@angular/common/http';

const LOGIN_PATH = '/api/v1/auth/login';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  // No añadir token al login
  if (req.url.includes(LOGIN_PATH)) {
    return next(req);
  }

  const token = localStorage.getItem('token');
  if (!token) {
    return next(req);
  }

  const authReq = req.clone({
    setHeaders: {
      Authorization: `Bearer ${token}`
    }
  });

  return next(authReq);
};
