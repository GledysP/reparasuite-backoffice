import { Component, OnInit, OnDestroy, AfterViewInit, inject, ElementRef, ViewChild } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { HttpClient } from '@angular/common/http';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';

import { TicketsService } from '../tickets.service';
import { TicketDetalleDto } from '../../../core/models/tipos';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'rs-tickets-detalle',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatSnackBarModule,
    MatTooltipModule,
  ],
  templateUrl: './tickets-detalle.component.html',
  styleUrl: './tickets-detalle.component.scss',
})
export class TicketsDetalleComponent implements OnInit, AfterViewInit, OnDestroy {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketsService = inject(TicketsService);
  private snack = inject(MatSnackBar);
  private http = inject(HttpClient);

  @ViewChild('summaryCard', { read: ElementRef }) summaryCard?: ElementRef<HTMLElement>;
  private io?: IntersectionObserver;

  /** Fallback temporal si backend aún no devuelve ordenTrabajoId */
  private readonly ticketOtCacheKey = 'rs_ticket_ot_map';

  id = this.route.snapshot.paramMap.get('id')!;
  loading = false;
  busy = false;

  ticket: TicketDetalleDto | null = null;
  otVinculadaId: string | null = null;

  stickyEnabled = false;
  fallaExpanded = false;

  /** Para resolver fotos protegidas por JWT (evita 401/404 en <img>) */
  private blobUrls: Record<string, string> = {};

  get yaTieneOt(): boolean {
    return !!this.otVinculadaId;
  }

  ngOnInit(): void {
    this.cargar();
  }

  ngAfterViewInit(): void {
    const el = this.summaryCard?.nativeElement;
    if (!el) return;

    const stickyTop = 92;

    this.io = new IntersectionObserver(
      (entries) => {
        const e = entries[0];
        this.stickyEnabled = !e.isIntersecting;
      },
      { root: null, threshold: 0, rootMargin: `-${stickyTop}px 0px 0px 0px` }
    );

    this.io.observe(el);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();

    Object.values(this.blobUrls).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    this.blobUrls = {};
  }

  cargar(): void {
    this.loading = true;

    this.ticketsService.obtener(this.id).subscribe({
      next: (t) => {
        const otBackend = this.extraerOtIdDesdeTicket(t);
        const otCache = this.obtenerVinculoTicketOtDesdeCache(t.id);
        const otFinal = otBackend || otCache || null;

        this.otVinculadaId = otFinal;

        if (t.id && otFinal) {
          this.guardarVinculoTicketOtEnCache(t.id, otFinal);
        }

        this.ticket = {
          ...t,
          ordenTrabajoId: otFinal ?? ((t as any).ordenTrabajoId ?? null),
        } as TicketDetalleDto;

        this.fallaExpanded = false;

        // Para que las fotos se vean aunque requieran Authorization
        this.hidratarFotosBlob(this.ticket);
      },
      error: () => this.snack.open('No se pudo cargar el ticket', 'OK', { duration: 2500 }),
      complete: () => (this.loading = false),
    });
  }

  // =========================
  // UI helpers
  // =========================

  capitalizeFirst(value: string): string {
    const s = (value ?? '').trim();
    if (!s) return '';
    return s.charAt(0).toUpperCase() + s.slice(1);
  }

  equipoTicket(t: TicketDetalleDto): string {
    return ((t as any).equipo || (t as any).asunto || '').toString().trim();
  }

  fallaTexto(t: TicketDetalleDto): string {
    return (t.descripcionFalla || t.descripcion || '—').toString().trim() || '—';
  }

  showFallaToggle(t: TicketDetalleDto): boolean {
    return this.fallaTexto(t).length > 90;
  }

  toggleFalla(): void {
    this.fallaExpanded = !this.fallaExpanded;
  }

  isCliente(tipo: string | null | undefined): boolean {
    const tt = String(tipo ?? '').toUpperCase();
    return tt.includes('CLIENTE') || tt.includes('PORTAL');
  }

  /**
   * ✅ Observaciones sin redundancia:
   * - Si backend manda `detalleAdicional`, usamos eso.
   * - Si manda `observaciones` como texto, removemos líneas redundantes (Falla/Tipo/Dirección)
   *   y devolvemos SOLO lo adicional.
   */
  observacionesExtraTexto(t: TicketDetalleDto): string {
    const anyT = t as unknown as Record<string, unknown>;

    const direct = String(anyT['detalleAdicional'] ?? '').trim();
    if (direct) return direct;

    const obsRaw = String(anyT['observaciones'] ?? '');
    if (!obsRaw.trim()) return '';

    const lines: string[] = obsRaw
      .split(/\r?\n/)
      .map((x: string) => x.trim())
      .filter((x: string) => Boolean(x))
      .filter((ln: string) => {
        const s = ln.toLowerCase();
        if (s.startsWith('falla reportada:')) return false;
        if (s.startsWith('tipo sugerido:')) return false;
        if (s.startsWith('dirección / ubicación:')) return false;
        if (s.startsWith('direccion / ubicacion:')) return false;
        if (s === 'observaciones') return false;
        return true;
      });

    const cleaned = lines
      .map((ln: string) => ln.replace(/^detalle\s*adicional\s*:\s*/i, '').trim())
      .filter((ln: string) => Boolean(ln))
      .join('\n')
      .trim();

    return cleaned;
  }

  // =========================
  // Acciones rápidas
  // =========================

  async copyText(text: string, label = 'Dato'): Promise<void> {
    const value = (text ?? '').trim();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const ta = document.createElement('textarea');
        ta.value = value;
        ta.style.position = 'fixed';
        ta.style.left = '-9999px';
        document.body.appendChild(ta);
        ta.select();
        document.execCommand('copy');
        document.body.removeChild(ta);
      }

      this.snack.open(`${label} copiado`, 'OK', { duration: 1400 });
    } catch {
      this.snack.open('No se pudo copiar', 'OK', { duration: 1600 });
    }
  }

  goCliente(clienteId: string): void {
    if (!clienteId) return;
    this.router.navigate(['/clientes', clienteId]);
  }

  // =========================
  // OT
  // =========================

  crearOt(): void {
    if (!this.ticket) return;

    // ✅ si ya existe, abrir directamente
    if (this.otVinculadaId) {
      this.router.navigate(['/ordenes-trabajo', this.otVinculadaId]);
      return;
    }

    const equipo = (this.ticket.equipo || this.ticket.asunto || '').trim();
    const falla = (this.ticket.descripcionFalla || '').trim();
    const tipo = this.ticket.tipoServicioSugerido || '';
    const direccion = this.ticket.direccion || '';
    const primeraFoto = this.fotosTicket(this.ticket)[0]?.url || '';

    this.router.navigate(['/ordenes-trabajo/nueva'], {
      queryParams: {
        fromTicket: '1',
        ticketId: this.ticket.id,

        // cliente
        clienteId: (this.ticket as any).clienteId ?? '',
        clienteNombre: (this.ticket as any).clienteNombre ?? '',
        clienteTelefono: (this.ticket as any).clienteTelefono ?? '',
        clienteEmail: (this.ticket as any).clienteEmail ?? '',

        // prefill
        equipo,
        descripcionFalla: falla,
        tipo: tipo ?? '',
        direccion: direccion ?? '',

        // visual
        ticketFotoUrl: primeraFoto,
      },
    });
  }

  verOt(): void {
    if (!this.otVinculadaId) {
      this.snack.open('No se encontró una OT vinculada para este ticket', 'OK', { duration: 2500 });
      return;
    }
    this.router.navigate(['/ordenes-trabajo', this.otVinculadaId]);
  }

  // =========================
  // Fotos
  // =========================

  fotosTicket(t: TicketDetalleDto): { id: string; url: string; nombreOriginal?: string | null; createdAt: string }[] {
    if (Array.isArray((t as any).fotos) && (t as any).fotos.length) {
      return (t as any).fotos
        .filter((f: any) => !!f?.url)
        .map((f: any) => ({
          id: f.id ?? `foto-${Math.random().toString(36).slice(2)}`,
          url: this.resolveFileUrl(f.url),
          nombreOriginal: f.nombreOriginal ?? 'Foto ticket',
          createdAt: f.createdAt ?? t.createdAt,
        }));
    }

    if ((t as any).fotoUrl) {
      return [
        {
          id: 'legacy-foto',
          url: this.resolveFileUrl((t as any).fotoUrl),
          nombreOriginal: 'Foto ticket',
          createdAt: t.createdAt,
        },
      ];
    }

    return [];
  }

  photoSrc(f: { id: string; url: string }): string {
    // si logramos bajarla como blob con JWT, usamos el objectURL
    return this.blobUrls[f.id] || f.url;
  }

  private hidratarFotosBlob(t: TicketDetalleDto): void {
    // limpiar blobs anteriores
    Object.values(this.blobUrls).forEach((u) => {
      try {
        URL.revokeObjectURL(u);
      } catch {}
    });
    this.blobUrls = {};

    const fotos = this.fotosTicket(t);
    if (!fotos.length) return;

    for (const f of fotos) {
      this.http.get(f.url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          const obj = URL.createObjectURL(blob);
          this.blobUrls[f.id] = obj;
        },
        error: () => {
          // si falla (404/401), el <img> intentará con URL original
        },
      });
    }
  }

  // =========================
  // Helpers Ticket -> OT cache
  // =========================

  private extraerOtIdDesdeTicket(t: TicketDetalleDto): string | null {
    const x = t as any;
    const candidatos = [x.ordenTrabajoId, x.otId, x.ordenTrabajo?.id, x.ordenTrabajo?.otId];
    for (const c of candidatos) {
      if (typeof c === 'string' && c.trim()) return c.trim();
    }
    return null;
  }

  private obtenerVinculoTicketOtDesdeCache(ticketId?: string | null): string | null {
    if (!ticketId) return null;

    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      if (!raw) return null;

      const map = JSON.parse(raw) as Record<string, string>;
      const otId = map?.[ticketId];

      return typeof otId === 'string' && otId.trim() ? otId.trim() : null;
    } catch {
      return null;
    }
  }

  private guardarVinculoTicketOtEnCache(ticketId: string, otId: string): void {
    if (!ticketId || !otId) return;

    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[ticketId] = otId;
      localStorage.setItem(this.ticketOtCacheKey, JSON.stringify(map));
    } catch {}
  }

  // =========================
  // Helpers URL
  // =========================

  private resolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }
}