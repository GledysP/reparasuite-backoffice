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

  // ✅ NUEVO
  crearOt(): void {
    if (!this.ticket) return;

    // si ya está ligada, solo navegar
    const existente = this.ticket.ordenTrabajoId;
    if (existente) {
      this.router.navigate(['/ordenes-trabajo', existente]);
      return;
    }

    this.busy = true;
    this.ticketsService.crearOtDesdeTicket(this.id).subscribe({
      next: (res) => {
        this.snack.open('OT creada desde el ticket', 'OK', { duration: 1800 });
        this.router.navigate(['/ordenes-trabajo', res.ordenTrabajoId]);
      },
      error: () => this.snack.open('No se pudo crear la OT', 'OK', { duration: 2500 }),
      complete: () => (this.busy = false)
    });
  }

  verOt(): void {
    const otId = this.ticket?.ordenTrabajoId;
    if (!otId) return;
    this.router.navigate(['/ordenes-trabajo', otId]);
  }
}
