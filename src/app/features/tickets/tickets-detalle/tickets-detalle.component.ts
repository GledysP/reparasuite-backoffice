import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
} from '@angular/core';
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

type TicketFotoUi = {
  id: string;
  url: string;
  nombreOriginal?: string | null;
  createdAt: string;
};

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
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly ticketsService = inject(TicketsService);
  private readonly snack = inject(MatSnackBar);
  private readonly http = inject(HttpClient);

  @ViewChild('summaryCard', { read: ElementRef })
  summaryCard?: ElementRef<HTMLElement>;

  private io?: IntersectionObserver;

  private readonly ticketOtCacheKey = 'rs_ticket_ot_map';

  id = this.route.snapshot.paramMap.get('id') ?? '';
  loading = false;
  busy = false;

  ticket: TicketDetalleDto | null = null;
  otVinculadaId: string | null = null;

  stickyEnabled = false;
  fallaExpanded = false;

  fotoModalAbierto = false;
  fotoModalUrl = '';

  private blobUrls: Record<string, string> = {};

  get yaTieneOt(): boolean {
    return !!this.otVinculadaId;
  }

  ngOnInit(): void {
    if (!this.id) {
      this.snack.open('Ticket inválido', 'OK', { duration: 2500 });
      return;
    }

    this.cargar();
  }

  ngAfterViewInit(): void {
    const element = this.summaryCard?.nativeElement;
    if (!element) return;

    const stickyTop = 92;

    this.io = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        this.stickyEnabled = !entry.isIntersecting;
      },
      {
        root: null,
        threshold: 0,
        rootMargin: `-${stickyTop}px 0px 0px 0px`,
      }
    );

    this.io.observe(element);
  }

  ngOnDestroy(): void {
    this.io?.disconnect();
    this.releaseBlobUrls();
  }

  cargar(): void {
    this.loading = true;

    this.ticketsService.obtener(this.id).subscribe({
      next: (ticket) => {
        const ordenTrabajoId = this.resolveOrdenTrabajoId(ticket);

        this.otVinculadaId = ordenTrabajoId;

        if (ticket.id && ordenTrabajoId) {
          this.saveTicketOtLink(ticket.id, ordenTrabajoId);
        }

        this.ticket = {
          ...ticket,
          ordenTrabajoId,
        };

        this.fallaExpanded = false;
        this.hidratarFotosBlob(this.ticket);
      },
      error: () => {
        this.snack.open('No se pudo cargar el ticket', 'OK', { duration: 2500 });
      },
      complete: () => {
        this.loading = false;
      },
    });
  }

  capitalizeFirst(value: string): string {
    const text = value.trim();
    if (!text) return '';
    return text.charAt(0).toUpperCase() + text.slice(1);
  }

  equipoTicket(ticket: TicketDetalleDto): string {
    return String(ticket.equipo || ticket.asunto || '').trim();
  }

  fallaTexto(ticket: TicketDetalleDto): string {
    const descripcionFalla = String(ticket.descripcionFalla ?? '').trim();
    if (descripcionFalla) return descripcionFalla;

    const desdeDescripcion = this.extraerFallaDesdeDescripcion(
      String(ticket.descripcion ?? '').trim()
    );
    if (desdeDescripcion) return desdeDescripcion;

    return String(ticket.descripcion ?? '—').trim() || '—';
  }

  observacionesTexto(ticket: TicketDetalleDto): string {
    const directas = this.limpiarTextoObservaciones(ticket.observaciones);
    if (directas) return directas;

    return this.extraerObservacionesDesdeDescripcion(
      String(ticket.descripcion ?? '').trim()
    );
  }

  showFallaToggle(ticket: TicketDetalleDto): boolean {
    return this.fallaTexto(ticket).length > 90;
  }

  toggleFalla(): void {
    this.fallaExpanded = !this.fallaExpanded;
  }

  isCliente(tipo: string | null | undefined): boolean {
    const normalized = String(tipo ?? '').toUpperCase();
    return normalized.includes('CLIENTE') || normalized.includes('PORTAL');
  }

  async copyText(text: string, label = 'Dato'): Promise<void> {
    const value = text.trim();
    if (!value) return;

    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement('textarea');
        textarea.value = value;
        textarea.style.position = 'fixed';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand('copy');
        document.body.removeChild(textarea);
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

  crearOt(): void {
    if (!this.ticket) return;

    if (this.otVinculadaId) {
      this.router.navigate(['/ordenes-trabajo', this.otVinculadaId]);
      return;
    }

    const equipo = this.equipoTicket(this.ticket);
    const descripcionFalla = this.fallaTexto(this.ticket);
    const tipo = this.ticket.tipoServicioSugerido || '';
    const direccion = this.ticket.direccion || '';
    const observaciones = this.observacionesTexto(this.ticket);
    const primeraFoto = this.fotosTicket(this.ticket)[0]?.url || '';

    this.router.navigate(['/ordenes-trabajo/nueva'], {
      queryParams: {
        fromTicket: '1',
        ticketId: this.ticket.id,
        clienteId: this.ticket.clienteId ?? '',
        clienteNombre: this.ticket.clienteNombre ?? '',
        clienteTelefono: this.ticket.clienteTelefono ?? '',
        clienteEmail: this.ticket.clienteEmail ?? '',
        equipo,
        descripcionFalla,
        tipo,
        direccion,
        observaciones,
        ticketFotoUrl: primeraFoto,
      },
    });
  }

  verOt(): void {
    if (!this.otVinculadaId) {
      this.snack.open('No se encontró una OT vinculada para este ticket', 'OK', {
        duration: 2500,
      });
      return;
    }

    this.router.navigate(['/ordenes-trabajo', this.otVinculadaId]).catch(() => {
      this.snack.open('No se pudo abrir la orden vinculada', 'OK', {
        duration: 2500,
      });
    });
  }

  fotosTicket(ticket: TicketDetalleDto): TicketFotoUi[] {
    if (Array.isArray(ticket.fotos) && ticket.fotos.length) {
      return ticket.fotos
        .filter((foto) => !!foto?.url)
        .map((foto) => ({
          id: foto.id,
          url: this.resolveFileUrl(foto.url),
          nombreOriginal: foto.nombreOriginal ?? 'Foto ticket',
          createdAt: foto.createdAt,
        }));
    }

    if (ticket.fotoUrl) {
      return [
        {
          id: 'legacy-foto',
          url: this.resolveFileUrl(ticket.fotoUrl),
          nombreOriginal: 'Foto ticket',
          createdAt: ticket.createdAt,
        },
      ];
    }

    return [];
  }

  photoSrc(foto: TicketFotoUi): string {
    return this.blobUrls[foto.id] || foto.url;
  }

  abrirFoto(foto: TicketFotoUi): void {
    this.fotoModalUrl = this.photoSrc(foto);
    this.fotoModalAbierto = true;
  }

  cerrarFoto(): void {
    this.fotoModalAbierto = false;
    this.fotoModalUrl = '';
  }

  private hidratarFotosBlob(ticket: TicketDetalleDto): void {
    this.releaseBlobUrls();

    const fotos = this.fotosTicket(ticket);
    if (!fotos.length) return;

    for (const foto of fotos) {
      this.http.get(foto.url, { responseType: 'blob' }).subscribe({
        next: (blob) => {
          this.blobUrls[foto.id] = URL.createObjectURL(blob);
        },
        error: () => {
          // fallback silencioso
        },
      });
    }
  }

  private releaseBlobUrls(): void {
    Object.values(this.blobUrls).forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch {
        // ignorar
      }
    });

    this.blobUrls = {};
  }

  private resolveOrdenTrabajoId(ticket: TicketDetalleDto): string | null {
    const fromBackend =
      typeof ticket.ordenTrabajoId === 'string' && ticket.ordenTrabajoId.trim()
        ? ticket.ordenTrabajoId.trim()
        : null;

    if (fromBackend) return fromBackend;

    return this.getTicketOtLink(ticket.id);
  }

  private getTicketOtLink(ticketId?: string | null): string | null {
    if (!ticketId) return null;

    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      if (!raw) return null;

      const map = JSON.parse(raw) as Record<string, string>;
      const otId = map[ticketId];

      return typeof otId === 'string' && otId.trim() ? otId.trim() : null;
    } catch {
      return null;
    }
  }

  private saveTicketOtLink(ticketId: string, otId: string): void {
    if (!ticketId || !otId) return;

    try {
      const raw = localStorage.getItem(this.ticketOtCacheKey);
      const map = raw ? (JSON.parse(raw) as Record<string, string>) : {};
      map[ticketId] = otId;
      localStorage.setItem(this.ticketOtCacheKey, JSON.stringify(map));
    } catch {
      // ignorar
    }
  }

  private resolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const path = url.startsWith('/') ? url : `/${url}`;
    return `${window.location.origin}${path}`;
  }

  private extraerFallaDesdeDescripcion(text: string): string {
    const raw = text.trim();
    if (!raw) return '';

    const matchInline =
      raw.match(/Falla reportada:\s*(.+)/i) ||
      raw.match(/Descripci[oó]n de la falla:\s*(.+)/i);

    if (matchInline?.[1]) {
      return matchInline[1].trim();
    }

    const matchBlock = raw.match(
      /Falla reportada:\s*([\s\S]*?)(?:\n[A-ZÁÉÍÓÚa-z].*?:|$)/i
    );

    return matchBlock?.[1]?.trim() || '';
  }

  private extraerObservacionesDesdeDescripcion(text: string): string {
    const raw = text.trim();
    if (!raw) return '';

    const matchDirect = raw.match(
      /(?:detalle\s+adicional|observaciones)\s*:\s*([\s\S]*)$/i
    );

    if (matchDirect?.[1]?.trim()) {
      return this.limpiarTextoObservaciones(matchDirect[1]);
    }

    const lines = raw
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter(Boolean);

    if (!lines.length) return '';

    const filtered = lines.filter((line) => {
      const s = line.toLowerCase();

      if (s.startsWith('falla reportada:')) return false;
      if (s.startsWith('descripción de la falla:')) return false;
      if (s.startsWith('descripcion de la falla:')) return false;
      if (s.startsWith('tipo sugerido:')) return false;
      if (s.startsWith('dirección / ubicación:')) return false;
      if (s.startsWith('direccion / ubicacion:')) return false;
      if (s.startsWith('equipo:')) return false;
      if (s.startsWith('equipo / asunto:')) return false;
      if (s.startsWith('observaciones:')) return false;
      if (s.startsWith('detalle adicional:')) return false;

      return true;
    });

    const joined = filtered.join('\n').trim();
    const falla = this.extraerFallaDesdeDescripcion(raw);

    if (!joined || joined === falla) return '';

    return this.limpiarTextoObservaciones(joined);
  }

  private limpiarTextoObservaciones(value: string | null | undefined): string {
    return String(value ?? '')
      .trim()
      .replace(/^detalle\s+adicional\s*:\s*/i, '')
      .replace(/^observaciones\s*:\s*/i, '')
      .trim();
  }
}