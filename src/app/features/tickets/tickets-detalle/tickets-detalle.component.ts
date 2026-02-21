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

type ParsedFromTicket = {
  telefono?: string;
  tipo?: 'TIENDA' | 'DOMICILIO';
  direccion?: string;
};

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

  id = this.route.snapshot.paramMap.get('id')!;
  loading = false;
  busy = false;

  ticket: TicketDetalleDto | null = null;

  formMsg = this.fb.group({
    contenido: ['', [Validators.required, Validators.minLength(1)]]
  });

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.ticketsService.obtener(this.id).subscribe({
      next: (t) => (this.ticket = t),
      error: () => this.snack.open('No se pudo cargar el ticket', 'OK', { duration: 2500 }),
      complete: () => (this.loading = false)
    });
  }

  enviar(): void {
    if (this.formMsg.invalid || !this.ticket) return;
    const contenido = this.formMsg.controls.contenido.value!.trim();
    if (!contenido) return;

    this.busy = true;
    this.ticketsService.enviarMensaje(this.id, contenido).subscribe({
      next: () => {
        this.formMsg.reset();
        this.snack.open('Mensaje enviado', 'OK', { duration: 1500 });
        this.cargar();
      },
      error: () => this.snack.open('No se pudo enviar el mensaje', 'OK', { duration: 2500 }),
      complete: () => (this.busy = false)
    });
  }

  // ✅ FASE 1: NO tocar backend.
  // En vez de POST /crear-ot => ir a /ordenes-trabajo/nueva con prefill desde ticket.
  crearOt(): void {
    if (!this.ticket) return;

    const existente = (this.ticket as any).ordenTrabajoId;
    if (existente) {
      this.router.navigate(['/ordenes-trabajo', existente]);
      return;
    }

    const asunto = (this.ticket.asunto || '').trim();
    const descripcion = (this.ticket.descripcion || '').trim();
    const parsed = this.parseTicketText(descripcion);

    this.router.navigate(['/ordenes-trabajo/nueva'], {
      queryParams: {
        fromTicket: '1',
        ticketId: this.id,
        asunto,
        descripcion,
        tipo: parsed.tipo ?? '',
        telefono: parsed.telefono ?? '',
        direccion: parsed.direccion ?? ''
      }
    });
  }

  verOt(): void {
    const otId = (this.ticket as any)?.ordenTrabajoId;
    if (!otId) return;
    this.router.navigate(['/ordenes-trabajo', otId]);
  }

  private parseTicketText(text: string): ParsedFromTicket {
    const raw = text || '';
    const lower = raw.toLowerCase();

    const telMatch =
      raw.match(/(tel[eé]fono|tel|tlf)\s*[:\-]?\s*([0-9+\s]{7,})/i) ||
      raw.match(/(\+?\d[\d\s]{7,}\d)/);

    const telefono = telMatch
      ? (telMatch[2] || telMatch[1]).replace(/\s+/g, '').trim()
      : undefined;

    let tipo: 'TIENDA' | 'DOMICILIO' | undefined;
    if (lower.includes('domicilio') || lower.includes('en sitio') || lower.includes('en casa')) tipo = 'DOMICILIO';
    if (lower.includes('tienda') || lower.includes('en tienda')) tipo = 'TIENDA';

    const dirMatch = raw.match(/(direcci[oó]n|ubicaci[oó]n)\s*[:\-]\s*(.+)/i);
    const direccion = dirMatch ? dirMatch[2].trim() : undefined;

    return { telefono, tipo, direccion };
  }
}
