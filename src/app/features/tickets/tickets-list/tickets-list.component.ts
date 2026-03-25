import { Component, OnInit, DestroyRef, inject } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { RouterLink } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';

import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatProgressBarModule } from '@angular/material/progress-bar';

import { TicketsService } from '../tickets.service';
import { TicketBackofficeListaItem } from '../../../core/models/tipos';

@Component({
  selector: 'rs-tickets-list',
  standalone: true,
  imports: [
    CommonModule,
    DatePipe,
    RouterLink,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatProgressBarModule
  ],
  templateUrl: './tickets-list.component.html',
  styleUrl: './tickets-list.component.scss'
})
export class TicketsListComponent implements OnInit {
  private readonly ticketsService = inject(TicketsService);
  private readonly destroyRef = inject(DestroyRef);

  loading = false;

  items: TicketBackofficeListaItem[] = [];
  total = 0;
  page = 0;
  size = 20;

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;

    this.ticketsService
      .listar(this.page, this.size)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (res) => {
          this.items = res.items ?? [];
          this.total = res.total ?? 0;
        },
        error: (e) => {
          console.error('Error tickets:', e);
          this.items = [];
          this.total = 0;
        },
        complete: () => {
          this.loading = false;
        }
      });
  }

  paginar(e: PageEvent): void {
    this.page = e.pageIndex;
    this.size = e.pageSize;
    this.cargar();
  }

  trackById(_: number, item: TicketBackofficeListaItem): string {
    return item.id;
  }

  estadoClass(estado?: string | null): string {
    const e = (estado || '').toUpperCase();

    if (e.includes('ABIERTO')) return 'is-open';
    if (e.includes('REVISION')) return 'is-review';
    if (e.includes('CERRADO')) return 'is-closed';

    return 'is-default';
  }

  asuntoUi(t: TicketBackofficeListaItem): string {
    const asunto = (t.asunto || '').trim();

    if (!asunto) return 'Sin asunto';

    return asunto.replace(/^soporte\s*:/i, 'Equipo:');
  }
}