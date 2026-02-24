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
    const contenido = this.formMsg.controls.contenido.value?.trim();
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

  // ✅ Flujo B (principal): abrir formulario de nueva OT con prefill desde ticket
  crearOt(): void {
    if (!this.ticket) return;

    const existente = this.ticket.ordenTrabajoId;
    if (existente) {
      this.router.navigate(['/ordenes-trabajo', existente]);
      return;
    }

    const equipo = (this.ticket.equipo || this.ticket.asunto || '').trim();
    const falla = (this.ticket.descripcionFalla || '').trim();
    const tipo = this.ticket.tipoServicioSugerido || '';
    const direccion = this.ticket.direccion || '';
    const primeraFoto = this.ticket.fotos?.[0]?.url || '';

    this.router.navigate(['/ordenes-trabajo/nueva'], {
      queryParams: {
        fromTicket: '1',
        ticketId: this.ticket.id,

        // cliente
        clienteId: this.ticket.clienteId ?? '',
        clienteNombre: this.ticket.clienteNombre ?? '',
        clienteTelefono: this.ticket.clienteTelefono ?? '',
        clienteEmail: this.ticket.clienteEmail ?? '',

        // ✅ OT prefill
        equipo,
        descripcionFalla: falla,
        tipo: tipo ?? '',
        direccion: direccion ?? '',

        // ✅ vista previa de foto del ticket (MVP visual)
        ticketFotoUrl: primeraFoto
      }
    });
  }

  verOt(): void {
    const otId = this.ticket?.ordenTrabajoId;
    if (!otId) return;
    this.router.navigate(['/ordenes-trabajo', otId]);
  }

  fotosTicket(t: TicketDetalleDto): { id: string; url: string; nombreOriginal?: string | null; createdAt: string }[] {
    if (Array.isArray(t.fotos) && t.fotos.length) return t.fotos;
    if (t.fotoUrl) {
      return [{
        id: 'legacy-foto',
        url: t.fotoUrl,
        nombreOriginal: 'Foto ticket',
        createdAt: t.createdAt
      }];
    }
    return [];
  }

  equipoTicket(t: TicketDetalleDto): string {
    return (t.equipo || t.asunto || '').trim();
  }
}