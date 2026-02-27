import { Component, OnInit, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';

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
    ReactiveFormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatProgressBarModule,
    MatSnackBarModule
  ],
  templateUrl: './tickets-detalle.component.html',
  styleUrl: './tickets-detalle.component.scss'
})
export class TicketsDetalleComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketsService = inject(TicketsService);
  private snack = inject(MatSnackBar);
  private fb = inject(FormBuilder);

  /** Fallback temporal si backend aún no devuelve ordenTrabajoId */
  private readonly ticketOtCacheKey = 'rs_ticket_ot_map';

  id = this.route.snapshot.paramMap.get('id')!;
  loading = false;
  busy = false;

  ticket: TicketDetalleDto | null = null;

  /** Estado derivado para el template (mejor que duplicar lógica en HTML) */
  otVinculadaId: string | null = null;

  /** ✅ Tu HTML puede usar esto sin errores */
  get yaTieneOt(): boolean {
    return !!this.otVinculadaId;
  }

  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;

    this.ticketsService.obtener(this.id).subscribe({
      next: (t) => {
        const otBackend = this.extraerOtIdDesdeTicket(t);
        const otCache = this.obtenerVinculoTicketOtDesdeCache(t.id);
        const otFinal = otBackend || otCache || null;

        this.otVinculadaId = otFinal;

        // Refuerzo: si backend ya lo trae, lo persistimos para futuras cargas
        if (t.id && otFinal) {
          this.guardarVinculoTicketOtEnCache(t.id, otFinal);
        }

        // Parcheamos el objeto local para que también funcione si tu HTML usa ticket?.ordenTrabajoId
        this.ticket = {
          ...t,
          ordenTrabajoId: otFinal ?? ((t as any).ordenTrabajoId ?? null)
        } as TicketDetalleDto;
      },
      error: () => {
        this.snack.open('No se pudo cargar el ticket', 'OK', { duration: 2500 });
      },
      complete: () => {
        this.loading = false;
      }
    });
  }

  enviar(): void {
    if (this.formMsg.invalid || !this.ticket) return;

    const contenido = this.formMsg.controls.contenido.value?.trim();
    if (!contenido) return;

    this.busy = true;
    this.ticketsService.enviarMensaje(this.id, contenido).subscribe({
      next: () => {
        this.formMsg.reset();
        this.snack.open('Mensaje enviado', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: () => {
        this.snack.open('No se pudo enviar el mensaje', 'OK', { duration: 2500 });
      },
      complete: () => {
        this.busy = false;
      }
    });
  }

  /**
   * Crear OT si no existe, o abrirla si ya está vinculada.
   */
  crearOt(): void {
    if (!this.ticket) return;

    // ✅ Si ya existe (backend o cache), abrir directamente
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
        clienteId: this.ticket.clienteId ?? '',
        clienteNombre: this.ticket.clienteNombre ?? '',
        clienteTelefono: this.ticket.clienteTelefono ?? '',
        clienteEmail: this.ticket.clienteEmail ?? '',

        // prefill OT
        equipo,
        descripcionFalla: falla,
        tipo: tipo ?? '',
        direccion: direccion ?? '',

        // visual (opcional)
        ticketFotoUrl: primeraFoto
      }
    });
  }

  verOt(): void {
    if (!this.otVinculadaId) {
      this.snack.open('No se encontró una OT vinculada para este ticket', 'OK', { duration: 2500 });
      return;
    }

    this.router.navigate(['/ordenes-trabajo', this.otVinculadaId]);
  }

  fotosTicket(t: TicketDetalleDto): { id: string; url: string; nombreOriginal?: string | null; createdAt: string }[] {
    if (Array.isArray((t as any).fotos) && (t as any).fotos.length) {
      return (t as any).fotos
        .filter((f: any) => !!f?.url)
        .map((f: any) => ({
          id: f.id ?? `foto-${Math.random().toString(36).slice(2)}`,
          url: this.resolveFileUrl(f.url),
          nombreOriginal: f.nombreOriginal ?? 'Foto ticket',
          createdAt: f.createdAt ?? t.createdAt
        }));
    }

    if ((t as any).fotoUrl) {
      return [{
        id: 'legacy-foto',
        url: this.resolveFileUrl((t as any).fotoUrl),
        nombreOriginal: 'Foto ticket',
        createdAt: t.createdAt
      }];
    }

    return [];
  }

  equipoTicket(t: TicketDetalleDto): string {
    return ((t as any).equipo || (t as any).asunto || '').trim();
  }

  // =========================
  // Helpers vínculo Ticket -> OT
  // =========================

  private extraerOtIdDesdeTicket(t: TicketDetalleDto): string | null {
    const x = t as any;

    const candidatos = [
      x.ordenTrabajoId,
      x.otId,
      x.ordenTrabajo?.id,
      x.ordenTrabajo?.otId
    ];

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
    } catch {
      // silencioso
    }
  }

  // =========================
  // Helpers URL fotos
  // =========================

  private resolveFileUrl(url?: string | null): string {
    if (!url) return '';
    if (/^https?:\/\//i.test(url)) return url;

    const base = (environment.apiBaseUrl || '').replace(/\/$/, '');
    const path = url.startsWith('/') ? url : `/${url}`;
    return `${base}${path}`;
  }
}