import { Pipe, PipeTransform, OnDestroy, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { DomSanitizer, SafeUrl } from '@angular/platform-browser';
import { Observable, of } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

@Pipe({
  name: 'authImage',
  standalone: true,
})
export class AuthImagePipe implements PipeTransform, OnDestroy {
  private http = inject(HttpClient);
  private sanitizer = inject(DomSanitizer);
  private latestObjectUrl: string | null = null;

  transform(url: string): Observable<SafeUrl | string> {
    if (!url) {
      return of('');
    }

    return this.http.get(url, { responseType: 'blob' }).pipe(
      map((blob) => {
        // Liberamos la memoria del blob anterior si el Pipe se reutiliza
        if (this.latestObjectUrl) {
          URL.revokeObjectURL(this.latestObjectUrl);
        }
        this.latestObjectUrl = URL.createObjectURL(blob);
        return this.sanitizer.bypassSecurityTrustUrl(this.latestObjectUrl);
      }),
      catchError(() => of('')) // Retorna string vacío en caso de 401/404 para no quebrar la app
    );
  }

  ngOnDestroy(): void {
    // Limpieza estricta de memoria al destruir el componente/imagen
    if (this.latestObjectUrl) {
      URL.revokeObjectURL(this.latestObjectUrl);
    }
  }
}